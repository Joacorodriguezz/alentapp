import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../../app.js';
import { CreateDisciplineRequest, UpdateDisciplineRequest } from '@alentapp/shared';

// Mockeamos los repositorios para testear la integración sin BD real
// Esto nos permite testear: Fastify -> Controller -> UseCase -> Validator -> (Mocked Repo)
vi.mock('../../infrastructure/repositories/PostgresDisciplineRepository.js', () => {
    const disciplinesInMemory: any = {
        'discipline-1': {
            id: 'discipline-1',
            reason: 'Conducta antisportiva',
            startDate: '2026-05-01T10:00:00',
            endDate: '2026-05-15T10:00:00',
            isTotalSuspension: true,
            memberId: 'member-123',
            deletedAt: null,
            createdAt: '2026-05-01T10:00:00',
            updatedAt: '2026-05-01T10:00:00',
        }
    };

    return {
        PostgresDisciplineRepository: class {
            async create(data: CreateDisciplineRequest) {
                const id = `discipline-${Date.now()}`;
                const discipline = {
                    id,
                    ...data,
                    deletedAt: null,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                };
                disciplinesInMemory[id] = discipline;
                return discipline;
            }

            async findAll(filters?: any) {
                const allDisciplines = Object.values(disciplinesInMemory);
                let result = allDisciplines;

                if (filters?.memberId) {
                    result = result.filter((d: any) => d.memberId === filters.memberId);
                }

                if (filters?.onlyActive) {
                    result = result.filter((d: any) => d.deletedAt === null);
                }

                return result;
            }

            async findById(id: string) {
                return disciplinesInMemory[id] || null;
            }

            async update(id: string, data: UpdateDisciplineRequest) {
                const discipline = disciplinesInMemory[id];
                if (!discipline) return null;

                const updated = {
                    ...discipline,
                    ...data,
                    updatedAt: new Date().toISOString(),
                };
                disciplinesInMemory[id] = updated;
                return updated;
            }

            async softDelete(id: string) {
                const discipline = disciplinesInMemory[id];
                if (!discipline) return;
                discipline.deletedAt = new Date().toISOString();
            }
        }
    };
});

vi.mock('../../infrastructure/repositories/PostgresMemberRepository.js', () => {
    return {
        PostgresMemberRepository: class {
            async findById(id: string) {
                return id === 'member-123' ? { id, name: 'Juan Pérez' } : null;
            }
        }
    };
});

describe('Discipline API Integration Tests', () => {
    let app: FastifyInstance;

    beforeAll(async () => {
        app = buildApp();
        await app.ready();
    });

    afterAll(async () => {
        await app.close();
    });

    describe('GET /api/v1/disciplines', () => {
        it('debe retornar código 200 y el listado de disciplinas', async () => {
            const response = await app.inject({
                method: 'GET',
                url: '/api/v1/disciplines'
            });

            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.payload);
            expect(body.data).toBeInstanceOf(Array);
            expect(body.data.length).toBeGreaterThan(0);
            expect(body.data[0].id).toBe('discipline-1');
            expect(body.data[0].reason).toBe('Conducta antisportiva');
        });
    });

    describe('GET /api/v1/disciplines/:id', () => {
        it('debe retornar código 200 y los datos de una disciplina por ID', async () => {
            const response = await app.inject({
                method: 'GET',
                url: '/api/v1/disciplines/discipline-1'
            });

            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.payload);
            expect(body.data.id).toBe('discipline-1');
            expect(body.data.reason).toBe('Conducta antisportiva');
            expect(body.data.isTotalSuspension).toBe(true);
        });

        it('debe retornar 404 si la disciplina no existe', async () => {
            const response = await app.inject({
                method: 'GET',
                url: '/api/v1/disciplines/discipline-inexistente'
            });

            expect(response.statusCode).toBe(404);
            const body = JSON.parse(response.payload);
            expect(body.error).toBe('La sanción no existe');
        });
    });

    describe('POST /api/v1/disciplines', () => {
        it('debe retornar 201 y crear una disciplina exitosamente', async () => {
            const payload: CreateDisciplineRequest = {
                reason: 'Falta grave en partido',
                startDate: '2026-06-01T10:00:00',
                endDate: '2026-06-15T10:00:00',
                isTotalSuspension: false,
                memberId: 'member-123'
            };

            const response = await app.inject({
                method: 'POST',
                url: '/api/v1/disciplines',
                payload
            });

            expect(response.statusCode).toBe(201);
            const body = JSON.parse(response.payload);
            expect(body.data.reason).toBe('Falta grave en partido');
            expect(body.data.isTotalSuspension).toBe(false);
            expect(body.data.memberId).toBe('member-123');
            expect(body.data.id).toBeDefined();
        });

        it('debe retornar 404 si el socio no existe', async () => {
            const payload: CreateDisciplineRequest = {
                reason: 'Falta grave',
                startDate: '2026-06-01T10:00:00',
                endDate: '2026-06-15T10:00:00',
                isTotalSuspension: true,
                memberId: 'member-inexistente'
            };

            const response = await app.inject({
                method: 'POST',
                url: '/api/v1/disciplines',
                payload
            });

            expect(response.statusCode).toBe(404);
            const body = JSON.parse(response.payload);
            expect(body.error).toBe('El socio indicado no existe');
        });

        it('debe retornar 400 si la fecha de fin no es posterior a la de inicio', async () => {
            const payload: CreateDisciplineRequest = {
                reason: 'Falta grave',
                startDate: '2026-06-15T10:00:00',
                endDate: '2026-06-15T10:00:00', // Igual a startDate
                isTotalSuspension: false,
                memberId: 'member-123'
            };

            const response = await app.inject({
                method: 'POST',
                url: '/api/v1/disciplines',
                payload
            });

            expect(response.statusCode).toBe(400);
            const body = JSON.parse(response.payload);
            expect(body.error).toContain('fecha de fin debe ser posterior');
        });
    });

    describe('PUT /api/v1/disciplines/:id', () => {
        it('debe retornar 200 y actualizar una disciplina exitosamente', async () => {
            const payload: UpdateDisciplineRequest = {
                reason: 'Conducta antisportiva - Actualizada'
            };

            const response = await app.inject({
                method: 'PUT',
                url: '/api/v1/disciplines/discipline-1',
                payload
            });

            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.payload);
            expect(body.data.reason).toBe('Conducta antisportiva - Actualizada');
            expect(body.data.id).toBe('discipline-1');
        });

        it('debe retornar 400 si intenta actualizar una disciplina eliminada', async () => {
            // Primero eliminar la disciplina
            await app.inject({
                method: 'DELETE',
                url: '/api/v1/disciplines/discipline-1'
            });

            // Luego intentar actualizar
            const payload: UpdateDisciplineRequest = {
                reason: 'Nueva razón'
            };

            const response = await app.inject({
                method: 'PUT',
                url: '/api/v1/disciplines/discipline-1',
                payload
            });

            expect(response.statusCode).toBe(400);
            const body = JSON.parse(response.payload);
            expect(body.error).toContain('desactivada');
        });
    });

    describe('DELETE /api/v1/disciplines/:id', () => {
        it('debe retornar 200 y eliminar una disciplina exitosamente', async () => {
            // Crear una disciplina para eliminar
            const createPayload: CreateDisciplineRequest = {
                reason: 'Sanción a eliminar',
                startDate: '2026-07-01T10:00:00',
                endDate: '2026-07-15T10:00:00',
                isTotalSuspension: false,
                memberId: 'member-123'
            };

            const createResponse = await app.inject({
                method: 'POST',
                url: '/api/v1/disciplines',
                payload: createPayload
            });

            const createdId = JSON.parse(createResponse.payload).data.id;

            // Eliminar la disciplina
            const deleteResponse = await app.inject({
                method: 'DELETE',
                url: `/api/v1/disciplines/${createdId}`
            });

            expect(deleteResponse.statusCode).toBe(200);
            const body = JSON.parse(deleteResponse.payload);
            expect(body.data.deletedAt).not.toBeNull();
        });

        it('debe retornar 409 si intenta eliminar una disciplina ya eliminada', async () => {
            // Crear una disciplina
            const createPayload: CreateDisciplineRequest = {
                reason: 'Sanción para eliminar dos veces',
                startDate: '2026-07-01T10:00:00',
                endDate: '2026-07-15T10:00:00',
                isTotalSuspension: false,
                memberId: 'member-123'
            };

            const createResponse = await app.inject({
                method: 'POST',
                url: '/api/v1/disciplines',
                payload: createPayload
            });

            const createdId = JSON.parse(createResponse.payload).data.id;

            // Eliminar una vez
            await app.inject({
                method: 'DELETE',
                url: `/api/v1/disciplines/${createdId}`
            });

            // Intentar eliminar de nuevo
            const response = await app.inject({
                method: 'DELETE',
                url: `/api/v1/disciplines/${createdId}`
            });

            expect(response.statusCode).toBe(409);
            const body = JSON.parse(response.payload);
            expect(body.error).toContain('ya fue eliminada');
        });
    });
});
