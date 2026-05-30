import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../../app.js';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../generated/client/client.js';

describe('Sport API End-to-End Tests', () => {
    let app: FastifyInstance;
    let prisma: PrismaClient;
    let createdSportId: string;

    const sportName = `E2E Sport ${Date.now()}`;

    beforeAll(async () => {
        app = buildApp();
        await app.ready();

        prisma = new PrismaClient({
            adapter: new PrismaPg(process.env.DATABASE_URL as string),
        });
        await prisma.$connect();
    });

    afterAll(async () => {
        if (createdSportId) {
            await prisma.sport.deleteMany({ where: { id: createdSportId } });
        }
        await prisma.$disconnect();
        await app.close();
    });

    it('GET /api/v1/sports debe retornar deportes desde la base de datos real', async () => {
        const response = await app.inject({ method: 'GET', url: '/api/v1/sports' });

        expect(response.statusCode).toBe(200);
        expect(Array.isArray(JSON.parse(response.payload).data)).toBe(true);
    });

    it('POST /api/v1/sports debe persistir el deporte en PostgreSQL', async () => {
        const response = await app.inject({
            method: 'POST',
            url: '/api/v1/sports',
            payload: {
                name: sportName,
                maxCapacity: 15,
                requiresMedicalCertificate: false,
            },
        });

        expect(response.statusCode).toBe(201);
        createdSportId = JSON.parse(response.payload).data.id;

        const dbSport = await prisma.sport.findUnique({ where: { id: createdSportId } });
        expect(dbSport?.name).toBe(sportName);
        expect(dbSport?.maxCapacity).toBe(15);
    });

    it('DELETE /api/v1/sports/:id debe eliminar el deporte de PostgreSQL', async () => {
        const response = await app.inject({
            method: 'DELETE',
            url: `/api/v1/sports/${createdSportId}`,
        });

        expect(response.statusCode).toBe(204);

        const dbSport = await prisma.sport.findUnique({ where: { id: createdSportId } });
        expect(dbSport).toBeNull();
        createdSportId = '';
    });
});
