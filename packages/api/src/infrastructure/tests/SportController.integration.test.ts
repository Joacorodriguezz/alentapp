import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../../app.js';
import { CreateSportRequest, UpdateSportRequest } from '@alentapp/shared';

const SPORT_ID = '550e8400-e29b-41d4-a716-446655440000';

vi.mock('../repositories/PostgresSportRepository.js', () => {
    const sportId = '550e8400-e29b-41d4-a716-446655440000';

    const sportsInMemory: Record<string, {
        id: string;
        name: string;
        description: string | null;
        maxCapacity: number;
        additionalPrice: number | null;
        requiresMedicalCertificate: boolean;
    }> = {
        [sportId]: {
            id: sportId,
            name: 'Fútbol',
            description: 'Deporte de equipo',
            maxCapacity: 20,
            additionalPrice: null,
            requiresMedicalCertificate: false,
        },
    };

    async function toDomain(record: {
        id: string;
        name: string;
        description: string | null;
        maxCapacity: number;
        additionalPrice: number | null;
        requiresMedicalCertificate: boolean;
    }) {
        const { Sport } = await import('../../domain/entities/Sport.js');
        return new Sport(
            record.id,
            record.name,
            record.description,
            record.maxCapacity,
            record.additionalPrice,
            record.requiresMedicalCertificate,
        );
    }

    return {
        PostgresSportRepository: class {
            async create(sport: {
                name: string;
                description: string | null;
                maxCapacity: number;
                additionalPrice: number | null;
                requiresMedicalCertificate: boolean;
            }) {
                const id = crypto.randomUUID();
                const record = {
                    id,
                    name: sport.name,
                    description: sport.description,
                    maxCapacity: sport.maxCapacity,
                    additionalPrice: sport.additionalPrice,
                    requiresMedicalCertificate: sport.requiresMedicalCertificate,
                };
                sportsInMemory[id] = record;
                return toDomain(record);
            }

            async findAll() {
                return Promise.all(Object.values(sportsInMemory).map(toDomain));
            }

            async findById(id: string) {
                const record = sportsInMemory[id];
                return record ? toDomain(record) : null;
            }

            async findByName(name: string) {
                const record = Object.values(sportsInMemory).find((sport) => sport.name === name);
                return record ? toDomain(record) : null;
            }

            async update(id: string, sport: {
                name: string;
                description: string | null;
                maxCapacity: number;
                additionalPrice: number | null;
                requiresMedicalCertificate: boolean;
            }) {
                const record = {
                    id,
                    name: sport.name,
                    description: sport.description,
                    maxCapacity: sport.maxCapacity,
                    additionalPrice: sport.additionalPrice,
                    requiresMedicalCertificate: sport.requiresMedicalCertificate,
                };
                sportsInMemory[id] = record;
                return toDomain(record);
            }

            async delete(id: string) {
                delete sportsInMemory[id];
            }
        },
    };
});

vi.mock('../repositories/PostgresEnrollmentRepository.js', () => ({
    PostgresEnrollmentRepository: class {
        async hasActiveEnrollmentsBySport() {
            return false;
        }
    },
}));

describe('Sport API Integration Tests', () => {
    let app: FastifyInstance;

    beforeAll(async () => {
        app = buildApp();
        await app.ready();
    });

    afterAll(async () => {
        await app.close();
    });

    it('GET /api/v1/sports debe retornar el listado', async () => {
        const response = await app.inject({ method: 'GET', url: '/api/v1/sports' });

        expect(response.statusCode).toBe(200);
        expect(JSON.parse(response.payload).data.length).toBeGreaterThan(0);
    });

    it('GET /api/v1/sports/:id debe retornar un deporte existente', async () => {
        const response = await app.inject({ method: 'GET', url: `/api/v1/sports/${SPORT_ID}` });

        expect(response.statusCode).toBe(200);
        expect(JSON.parse(response.payload).data.name).toBe('Fútbol');
    });

    it('POST /api/v1/sports debe crear un deporte', async () => {
        const payload: CreateSportRequest = { name: 'Tenis', maxCapacity: 12 };

        const response = await app.inject({ method: 'POST', url: '/api/v1/sports', payload });

        expect(response.statusCode).toBe(201);
        expect(JSON.parse(response.payload).data.name).toBe('Tenis');
    });

    it('POST /api/v1/sports debe retornar 409 si el nombre ya existe', async () => {
        const response = await app.inject({
            method: 'POST',
            url: '/api/v1/sports',
            payload: { name: 'Fútbol', maxCapacity: 10 },
        });

        expect(response.statusCode).toBe(409);
        expect(JSON.parse(response.payload).error).toBe('El deporte ya existe');
    });

    it('PATCH /api/v1/sports/:id debe actualizar un deporte', async () => {
        const payload: UpdateSportRequest = { maxCapacity: 22 };

        const response = await app.inject({
            method: 'PATCH',
            url: `/api/v1/sports/${SPORT_ID}`,
            payload,
        });

        expect(response.statusCode).toBe(200);
        expect(JSON.parse(response.payload).data.maxCapacity).toBe(22);
    });

    it('DELETE /api/v1/sports/:id debe eliminar un deporte', async () => {
        const createResponse = await app.inject({
            method: 'POST',
            url: '/api/v1/sports',
            payload: { name: 'Básquet', maxCapacity: 10 },
        });
        const createdId = JSON.parse(createResponse.payload).data.id;

        const deleteResponse = await app.inject({
            method: 'DELETE',
            url: `/api/v1/sports/${createdId}`,
        });

        expect(deleteResponse.statusCode).toBe(204);
    });
});
