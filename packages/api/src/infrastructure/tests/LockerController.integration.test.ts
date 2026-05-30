import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../../app.js';
import { Locker } from '../../domain/entities/Locker.js';
import type { CreateLockerRequest, UpdateLockerRequest } from '@alentapp/shared';

// ---------------------------------------------------------------------------
// Identificadores de prueba.
// Los IDs de locker deben tener formato UUID válido porque el LockerController
// valida el formato del :id antes de llamar al caso de uso (validateId).
// ---------------------------------------------------------------------------
const AVAILABLE_ID = '11111111-1111-4111-8111-111111111111'; // locker libre
const OCCUPIED_ID = '22222222-2222-4222-8222-222222222222'; // locker asignado a un socio
const MAINTENANCE_ID = '33333333-3333-4333-8333-333333333333'; // locker en mantenimiento
const NON_EXISTENT_ID = '44444444-4444-4444-8444-444444444444'; // no existe en el store
const DB_ERROR_ID = '99999999-9999-4999-8999-999999999999'; // fuerza una falla del repositorio
const INVALID_ID = 'no-es-un-uuid'; // formato inválido

const MEMBER_ID = 'member-abc'; // socio existente
const UNKNOWN_MEMBER_ID = 'member-fantasma'; // socio inexistente

// Store en memoria compartido entre el mock y el test, declarado con vi.hoisted
// para que esté disponible dentro de la factory de vi.mock (que se eleva al tope).
const store = vi.hoisted(() => ({
    lockers: new Map<string, Locker>(),
    members: new Map<string, { id: string; name: string }>(),
}));

// Clona la entidad para que los datos crucen el límite de persistencia como una
// estructura nueva e independiente (patrón "Objeto Humilde"). Si el mock
// devolviera la misma referencia almacenada, las mutaciones del caso de uso se
// filtrarían al store antes de tiempo, ocultando errores reales de integración.
const cloneLocker = vi.hoisted(() => (locker: Locker): Locker =>
    new Locker({
        id: locker.id,
        number: locker.number,
        location: locker.location,
        status: locker.status,
        memberId: locker.memberId,
    }),
);

// ---------------------------------------------------------------------------
// "Objeto Humilde": reemplazamos el adaptador de salida (Postgres) por un doble
// en memoria. Así probamos la HEBRA COMPLETA Fastify -> Controller -> UseCase ->
// Validator -> Entidad sin tocar la base de datos real.
// Importante: findById devuelve instancias reales de `Locker`, porque los casos
// de uso invocan métodos de dominio sobre el resultado (ensureCanBeDeleted,
// assignMember, unassignMember, moveToMaintenance, etc.).
// ---------------------------------------------------------------------------
vi.mock('../repositories/PostgresLockerRepository.js', () => {
    return {
        PostgresLockerRepository: class {
            async create(locker: Locker): Promise<Locker> {
                store.lockers.set(locker.id, cloneLocker(locker));
                return cloneLocker(locker);
            }

            async findByNumber(number: number): Promise<Locker | null> {
                for (const locker of store.lockers.values()) {
                    if (locker.number === number) return cloneLocker(locker);
                }
                return null;
            }

            async findAll(): Promise<Locker[]> {
                return Array.from(store.lockers.values())
                    .sort((a, b) => a.number - b.number)
                    .map(cloneLocker);
            }

            async findById(id: string): Promise<Locker | null> {
                // Falla forzada del componente llamado: el sistema debe atrapar la
                // excepción y devolver 500 sin colapsar.
                if (id === DB_ERROR_ID) {
                    throw new Error('Fallo de conexión a la base de datos');
                }
                const found = store.lockers.get(id);
                return found ? cloneLocker(found) : null;
            }

            async update(id: string, data: UpdateLockerRequest): Promise<Locker> {
                const existing = store.lockers.get(id)!;
                if (data.number !== undefined) existing.number = data.number;
                if (data.location !== undefined) existing.location = data.location;
                if (data.status !== undefined) existing.status = data.status;
                if (data.memberId !== undefined) existing.memberId = data.memberId;
                store.lockers.set(id, existing);
                return cloneLocker(existing);
            }

            async delete(id: string): Promise<void> {
                store.lockers.delete(id);
            }
        },
    };
});

vi.mock('../repositories/PostgresMemberRepository.js', () => {
    return {
        PostgresMemberRepository: class {
            async findById(id: string) {
                return store.members.get(id) ?? null;
            }
        },
    };
});

// ---------------------------------------------------------------------------
// Helpers de inyección HTTP.
// ---------------------------------------------------------------------------
let app: FastifyInstance;

beforeAll(async () => {
    app = buildApp();
    await app.ready(); // esperamos a que carguen los plugins (CORS, routers, etc.)
});

afterAll(async () => {
    await app.close();
});

// Limpieza de estado (Tear Down + regla F.I.R.S.T.): cada test arranca con un
// estado conocido y repetible, evitando fallos en cascada entre pruebas.
beforeEach(() => {
    store.lockers.clear();
    store.members.clear();

    store.members.set(MEMBER_ID, { id: MEMBER_ID, name: 'Socio de Prueba' });

    store.lockers.set(
        AVAILABLE_ID,
        new Locker({ id: AVAILABLE_ID, number: 10, location: 'Pasillo A', status: 'Available', memberId: null }),
    );
    store.lockers.set(
        OCCUPIED_ID,
        new Locker({ id: OCCUPIED_ID, number: 20, location: 'Pasillo B', status: 'Occupied', memberId: MEMBER_ID }),
    );
    store.lockers.set(
        MAINTENANCE_ID,
        new Locker({ id: MAINTENANCE_ID, number: 30, location: 'Pasillo C', status: 'Maintenance', memberId: null }),
    );
});

describe('Locker API Integration Tests', () => {
    // =======================================================================
    // GET /api/v1/lockers  (TDD-0007: Consulta de Lockers)
    // =======================================================================
    describe('GET /api/v1/lockers', () => {
        it('debe retornar 200 y el listado completo de lockers (hebra Controller -> UseCase -> Repo)', async () => {
            const response = await app.inject({ method: 'GET', url: '/api/v1/lockers' });

            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.payload);
            expect(body.data).toBeInstanceOf(Array);
            expect(body.data).toHaveLength(3);
            // La respuesta debe incluir todos los atributos del locker, incluido memberId.
            expect(body.data[0]).toMatchObject({
                id: AVAILABLE_ID,
                number: 10,
                location: 'Pasillo A',
                status: 'Available',
                memberId: null,
            });
        });
    });

    // =======================================================================
    // GET /api/v1/lockers/:id  (TDD-0007)
    // =======================================================================
    describe('GET /api/v1/lockers/:id', () => {
        it('debe retornar 200 y el detalle del locker, exponiendo el memberId asignado', async () => {
            const response = await app.inject({ method: 'GET', url: `/api/v1/lockers/${OCCUPIED_ID}` });

            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.payload);
            expect(body.data.id).toBe(OCCUPIED_ID);
            expect(body.data.status).toBe('Occupied');
            expect(body.data.memberId).toBe(MEMBER_ID);
        });

        it('debe retornar 404 si el locker no existe', async () => {
            const response = await app.inject({ method: 'GET', url: `/api/v1/lockers/${NON_EXISTENT_ID}` });

            expect(response.statusCode).toBe(404);
            expect(JSON.parse(response.payload).error).toBe('El locker no existe');
        });

        it('debe retornar 400 si el id tiene un formato inválido (validación en el límite de la interfaz)', async () => {
            const response = await app.inject({ method: 'GET', url: `/api/v1/lockers/${INVALID_ID}` });

            expect(response.statusCode).toBe(400);
            expect(JSON.parse(response.payload).error).toBe('El id del locker es inválido');
        });

        it('debe retornar 500 cuando el repositorio falla de forma forzada, manejando la excepción sin colapsar', async () => {
            const response = await app.inject({ method: 'GET', url: `/api/v1/lockers/${DB_ERROR_ID}` });

            expect(response.statusCode).toBe(500);
            expect(JSON.parse(response.payload).error).toBe('Error interno, reintente más tarde');
        });
    });

    // =======================================================================
    // POST /api/v1/lockers  (TDD-0004: Registro de Nuevo Locker)
    // =======================================================================
    describe('POST /api/v1/lockers', () => {
        it('debe retornar 200 y crear el locker con estado Available y memberId null por defecto', async () => {
            const payload: CreateLockerRequest = { number: 99, location: 'Vestuario Norte' };

            const response = await app.inject({ method: 'POST', url: '/api/v1/lockers', payload });

            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.payload);
            expect(body.data.number).toBe(99);
            expect(body.data.location).toBe('Vestuario Norte');
            expect(body.data.status).toBe('Available');
            expect(body.data.memberId).toBeNull();
            expect(body.data.id).toBeDefined();
        });

        it('debe atravesar el validador y retornar 409 si el número de locker ya existe', async () => {
            const payload: CreateLockerRequest = { number: 10, location: 'Duplicado' }; // 10 ya existe

            const response = await app.inject({ method: 'POST', url: '/api/v1/lockers', payload });

            expect(response.statusCode).toBe(409);
            expect(JSON.parse(response.payload).error).toBe('Ya existe un locker con ese número');
        });

        it('debe retornar 400 si el número está en el límite inválido (entero no positivo)', async () => {
            const payload = { number: 0, location: 'Pasillo X' } as CreateLockerRequest; // valor de borde

            const response = await app.inject({ method: 'POST', url: '/api/v1/lockers', payload });

            expect(response.statusCode).toBe(400);
            expect(JSON.parse(response.payload).error).toBe('El numero debe ser un entero positivo');
        });

        it('debe retornar 400 si se pasa una location nula/vacía a través de la interfaz', async () => {
            const payload = { number: 50, location: '   ' } as CreateLockerRequest; // referencia "vacía"

            const response = await app.inject({ method: 'POST', url: '/api/v1/lockers', payload });

            expect(response.statusCode).toBe(400);
            expect(JSON.parse(response.payload).error).toBe('La ubicación es obligatoria');
        });
    });

    // =======================================================================
    // PUT /api/v1/lockers/:id  (TDD-0005: Actualización de Lockers)
    // =======================================================================
    describe('PUT /api/v1/lockers/:id', () => {
        it('debe asignar un socio existente y transicionar automáticamente el estado a Occupied (hebra completa con IMemberRepository)', async () => {
            const payload: UpdateLockerRequest = { memberId: MEMBER_ID };

            const response = await app.inject({ method: 'PUT', url: `/api/v1/lockers/${AVAILABLE_ID}`, payload });

            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.payload);
            expect(body.data.memberId).toBe(MEMBER_ID);
            expect(body.data.status).toBe('Occupied');
        });

        it('debe liberar el locker y transicionar a Available cuando se envía memberId: null', async () => {
            const payload: UpdateLockerRequest = { memberId: null }; // referencia nula a través de la interfaz

            const response = await app.inject({ method: 'PUT', url: `/api/v1/lockers/${OCCUPIED_ID}`, payload });

            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.payload);
            expect(body.data.memberId).toBeNull();
            expect(body.data.status).toBe('Available');
        });

        it('debe retornar 404 si se intenta asignar un socio inexistente', async () => {
            const payload: UpdateLockerRequest = { memberId: UNKNOWN_MEMBER_ID };

            const response = await app.inject({ method: 'PUT', url: `/api/v1/lockers/${AVAILABLE_ID}`, payload });

            expect(response.statusCode).toBe(404);
            expect(JSON.parse(response.payload).error).toBe('El socio solicitado no existe');
        });

        it('debe retornar 404 si el locker a actualizar no existe', async () => {
            const payload: UpdateLockerRequest = { location: 'Nueva ubicación' };

            const response = await app.inject({ method: 'PUT', url: `/api/v1/lockers/${NON_EXISTENT_ID}`, payload });

            expect(response.statusCode).toBe(404);
            expect(JSON.parse(response.payload).error).toBe('El locker solicitado no existe');
        });

        it('debe retornar 409 si se intenta poner en Maintenance un locker que tiene un socio asignado', async () => {
            const payload: UpdateLockerRequest = { status: 'Maintenance' };

            const response = await app.inject({ method: 'PUT', url: `/api/v1/lockers/${OCCUPIED_ID}`, payload });

            expect(response.statusCode).toBe(409);
            expect(JSON.parse(response.payload).error).toBe(
                'No se puede poner un locker en mantenimiento si tiene un miembro asociado',
            );
        });

        it('debe retornar 409 si se intenta asignar un socio a un locker en Maintenance', async () => {
            const payload: UpdateLockerRequest = { memberId: MEMBER_ID };

            const response = await app.inject({ method: 'PUT', url: `/api/v1/lockers/${MAINTENANCE_ID}`, payload });

            expect(response.statusCode).toBe(409);
            expect(JSON.parse(response.payload).error).toBe(
                'No se puede asignar un socio a un locker en mantenimiento',
            );
        });

        it('debe retornar 409 si el nuevo número ya pertenece a otro locker', async () => {
            const payload: UpdateLockerRequest = { number: 20 }; // 20 pertenece al OCCUPIED

            const response = await app.inject({ method: 'PUT', url: `/api/v1/lockers/${AVAILABLE_ID}`, payload });

            expect(response.statusCode).toBe(409);
            expect(JSON.parse(response.payload).error).toBe('Ya existe un locker con ese número');
        });

        it('debe retornar 400 si el body no contiene ningún campo a actualizar', async () => {
            const response = await app.inject({ method: 'PUT', url: `/api/v1/lockers/${AVAILABLE_ID}`, payload: {} });

            expect(response.statusCode).toBe(400);
            expect(JSON.parse(response.payload).error).toBe('Debe enviar al menos un campo a actualizar');
        });
    });

    // =======================================================================
    // DELETE /api/v1/lockers/:id  (TDD-0006: Eliminación de Lockers)
    // =======================================================================
    describe('DELETE /api/v1/lockers/:id', () => {
        it('debe retornar 200 y eliminar físicamente el locker libre (verificando el estado posterior)', async () => {
            const deleteResponse = await app.inject({ method: 'DELETE', url: `/api/v1/lockers/${AVAILABLE_ID}` });

            expect(deleteResponse.statusCode).toBe(200);
            expect(JSON.parse(deleteResponse.payload).data.id).toBe(AVAILABLE_ID);

            // Verificamos la interacción real con el estado: ya no debe existir.
            const getResponse = await app.inject({ method: 'GET', url: `/api/v1/lockers/${AVAILABLE_ID}` });
            expect(getResponse.statusCode).toBe(404);
        });

        it('debe retornar 409 si se intenta eliminar un locker asignado a un socio', async () => {
            const response = await app.inject({ method: 'DELETE', url: `/api/v1/lockers/${OCCUPIED_ID}` });

            expect(response.statusCode).toBe(409);
            expect(JSON.parse(response.payload).error).toBe('No se puede eliminar un locker asignado a un socio');
        });

        it('debe retornar 404 si el locker a eliminar no existe', async () => {
            const response = await app.inject({ method: 'DELETE', url: `/api/v1/lockers/${NON_EXISTENT_ID}` });

            expect(response.statusCode).toBe(404);
            expect(JSON.parse(response.payload).error).toBe('El locker no existe');
        });

        it('debe retornar 400 si el id a eliminar tiene un formato inválido', async () => {
            const response = await app.inject({ method: 'DELETE', url: `/api/v1/lockers/${INVALID_ID}` });

            expect(response.statusCode).toBe(400);
            expect(JSON.parse(response.payload).error).toBe('El id del locker es inválido');
        });
    });
});
