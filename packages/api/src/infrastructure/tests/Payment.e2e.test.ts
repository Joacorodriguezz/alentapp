import { config } from 'dotenv';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../generated/client/client.js';
import { CreatePaymentRequest } from '@alentapp/shared';

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
config({ path: resolve(packageRoot, '.env') });

// Default: docker-compose.yml dev stack (alentapp_db). Override via .env or DATABASE_URL env var.
// E2E stack (docker-compose.e2e.yml) uses port 5433 and alentapp_test_db — set that in .env if needed.
if (!process.env.DATABASE_URL) {
    process.env.DATABASE_URL = 'postgresql://admin:password123@localhost:5432/alentapp_db';
}

const { buildApp } = await import('../../app.js');

describe('Payment API E2E Tests', () => {
    let app: FastifyInstance;
    let prisma: PrismaClient;
    let fixtureMemberId: string;
    let createdPaymentId: string;

    const randomSuffix = Math.floor(Math.random() * 100000).toString();

    beforeAll(async () => {
        app = buildApp();
        await app.ready();

        prisma = new PrismaClient({
            adapter: new PrismaPg(process.env.DATABASE_URL as string),
        });
        await prisma.$connect();

        const fixtureMember = await prisma.member.create({
            data: {
                dni: `PAYE2E${randomSuffix}`,
                name: 'Socio Fixture Payment E2E',
                email: `paye2e${randomSuffix}@test.com`,
                birthdate: new Date('2000-01-01'),
                category: 'Pleno',
            },
        });
        fixtureMemberId = fixtureMember.id;
    });

    afterAll(async () => {
        if (fixtureMemberId) {
            await prisma.payment.deleteMany({
                where: { memberId: fixtureMemberId },
            });
            await prisma.member.delete({
                where: { id: fixtureMemberId },
            });
        }
        await prisma.$disconnect();
        await app.close();
    });

    describe('POST /api/v1/payments', () => {
        it('debe retornar 201 y crear un pago con estado Pending en la base de datos', async () => {
            const payload: CreatePaymentRequest = {
                amount: 2000,
                description: 'Cuota E2E',
                paymentDate: '2026-06-01T10:00:00.000Z',
                memberId: fixtureMemberId,
            };

            const response = await app.inject({
                method: 'POST',
                url: '/api/v1/payments',
                payload,
            });

            expect(response.statusCode).toBe(201);
            const body = JSON.parse(response.payload);
            expect(body.data.status).toBe('Pending');
            expect(body.data.amount).toBe(2000);
            expect(body.data.memberId).toBe(fixtureMemberId);
            expect(body.data.id).toBeDefined();

            createdPaymentId = body.data.id as string;

            const dbPayment = await prisma.payment.findUnique({
                where: { id: createdPaymentId },
            });
            expect(dbPayment).not.toBeNull();
            expect(dbPayment?.status).toBe('Pending');
            expect(parseFloat(dbPayment!.amount.toString())).toBe(2000);
        });
    });

    describe('PUT /api/v1/payments/:id', () => {
        it('debe retornar 200 y confirmar un pago como Paid en la base de datos', async () => {
            const response = await app.inject({
                method: 'PUT',
                url: `/api/v1/payments/${createdPaymentId}`,
                payload: { status: 'Paid' },
            });

            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.payload);
            expect(body.data.id).toBe(createdPaymentId);
            expect(body.data.status).toBe('Paid');

            const dbPayment = await prisma.payment.findUnique({
                where: { id: createdPaymentId },
            });
            expect(dbPayment?.status).toBe('Paid');
        });
    });

    describe('DELETE /api/v1/payments/:id', () => {
        it('debe retornar 200 y cancelar un pago pendiente en la base de datos', async () => {
            const createPayload: CreatePaymentRequest = {
                amount: 500,
                description: 'Cuota E2E cancelación',
                paymentDate: '2026-06-01T10:00:00.000Z',
                memberId: fixtureMemberId,
            };

            const createResponse = await app.inject({
                method: 'POST',
                url: '/api/v1/payments',
                payload: createPayload,
            });

            const paymentToCancelId = JSON.parse(createResponse.payload).data.id as string;

            const response = await app.inject({
                method: 'DELETE',
                url: `/api/v1/payments/${paymentToCancelId}`,
            });

            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.payload);
            expect(body.data.status).toBe('Canceled');
            expect(body.data.deletedAt).not.toBeNull();

            const dbPayment = await prisma.payment.findUnique({
                where: { id: paymentToCancelId },
            });
            expect(dbPayment?.status).toBe('Canceled');
            expect(dbPayment?.deletedAt).not.toBeNull();
        });
    });
});
