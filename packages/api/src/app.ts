import Fastify from 'fastify';
import cors from '@fastify/cors';
import { lockerRoutes } from './infrastructure/routers/LockerRouter.js';
import { disciplineRouter } from './infrastructure/routers/DisciplineRouter.js';
import { memberRoutes } from './infrastructure/routers/memberRoutes.js';
import { paymentRoutes } from './infrastructure/routers/paymentRoutes.js';
import { equipmentLoanRoutes } from './infrastructure/routers/EquipmentLoanRouter.js';
import { sportRoutes } from './infrastructure/routers/sportRoutes.js';


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

    server.get('/', async (req, rep) => {
        rep.status(200).send({ msg: 'asd' })
    });

    return server;
}
