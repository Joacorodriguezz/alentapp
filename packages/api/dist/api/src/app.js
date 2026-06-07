import './infrastructure/telemetry.js';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import { lockerRoutes } from './infrastructure/routers/LockerRouter.js';
import { disciplineRouter } from './infrastructure/routers/DisciplineRouter.js';
import { memberRoutes } from './infrastructure/routers/memberRoutes.js';
import { paymentRoutes } from './infrastructure/routers/paymentRoutes.js';
import { equipmentLoanRoutes } from './infrastructure/routers/EquipmentLoanRouter.js';
import { sportRoutes } from './infrastructure/routers/sportRoutes.js';
import { medicalCertificateRoutes } from './infrastructure/routers/medicalCertificateRoutes.js';
import { decrementActiveRequests, incrementActiveRequests, redMetrics, shutdownTelemetry, } from './infrastructure/telemetry.js';
export function buildApp() {
    const server = Fastify({
        logger: {
            level: 'info',
            transport: process.env.NODE_ENV === 'development'
                ? {
                    target: 'pino-pretty',
                    options: { translateTime: 'HH:MM:ss Z', ignore: 'pid,hostname' },
                }
                : undefined,
        },
    });
    server.addHook('onRequest', async (request) => {
        request.startTime = Date.now();
        incrementActiveRequests();
    });
    server.addHook('onResponse', async (request, reply) => {
        const route = request.routeOptions.url ?? 'unknown';
        const method = request.method;
        const status = String(reply.statusCode);
        const labels = { method, route, status };
        redMetrics.requestCounter.add(1, labels);
        if (reply.statusCode >= 400) {
            redMetrics.errorCounter.add(1, labels);
        }
        if (request.startTime !== undefined) {
            redMetrics.requestDuration.record(Date.now() - request.startTime, { method, route });
        }
        decrementActiveRequests();
    });
    server.register(cors, {
        origin: true,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization'],
        credentials: true,
    });
    server.register(memberRoutes);
    server.register(paymentRoutes);
    server.register(equipmentLoanRoutes);
    server.register(sportRoutes);
    server.register(disciplineRouter);
    server.register(lockerRoutes);
    server.register(medicalCertificateRoutes);
    server.get('/health', async (_req, rep) => {
        rep.status(200).send({ status: 'ok' });
    });
    server.get('/', async (req, rep) => {
        rep.status(200).send({ msg: 'asd' });
    });
    return server;
}
// Solo iniciar el servidor si el script se ejecuta directamente (no cuando es importado por vitest)
if (process.argv[1] && process.argv[1].endsWith('app.ts')) {
    const server = buildApp();
    const port = parseInt(process.env.PORT || '3000', 10);
    server.listen({ port, host: '0.0.0.0' }, () => server.log.info(`API server running on http://localhost:${port}`));
    ['SIGINT', 'SIGTERM'].forEach((signal) => {
        process.on(signal, async () => {
            await shutdownTelemetry();
            await server.close();
            process.exit(0);
        });
    });
}
