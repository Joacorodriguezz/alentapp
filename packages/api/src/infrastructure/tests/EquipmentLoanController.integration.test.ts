import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../../app.js';
import { EquipmentLoanStatus } from '@alentapp/shared';

// ──────────────────────────────────────────────────────────────────────────────
// Mocks de los repositorios de Postgres.
// Esto permite testear el ciclo completo:
//   Fastify → Controller → UseCase → Entidad de Dominio → (Mock) Repositorio
// sin necesidad de una base de datos real.
//
// Todos los repositorios que importan el cliente Prisma generado deben ser
// mockeados para que buildApp() pueda inicializarse en el entorno de test.
// Los stubs de repositorios no relacionados con EquipmentLoan son mínimos
// (solo evitan el error de importación).
// ──────────────────────────────────────────────────────────────────────────────

// ── Stubs mínimos para repositorios no relacionados con EquipmentLoan ────────
vi.mock('../repositories/PostgresDisciplineRepository.js', () => ({
    PostgresDisciplineRepository: class {
        async findAll() { return []; }
        async findById() { return null; }
        async create(d: any) { return d; }
        async update(d: any) { return d; }
        async softDelete() {}
    },
}));

vi.mock('../repositories/PostgresLockerRepository.js', () => ({
    PostgresLockerRepository: class {
        async findAll() { return []; }
        async findById() { return null; }
        async create(d: any) { return d; }
        async update(d: any) { return d; }
        async delete() {}
    },
}));

vi.mock('../repositories/PostgresMedicalCertificateRepository.js', () => ({
    PostgresMedicalCertificateRepository: class {
        async findAll() { return []; }
        async findById() { return null; }
        async create(d: any) { return d; }
        async update(d: any) { return d; }
        async delete() {}
    },
}));

vi.mock('../repositories/PostgresPaymentRepository.js', () => ({
    PostgresPaymentRepository: class {
        async findAll() { return []; }
        async findById() { return null; }
        async findByIdIncludeDeleted() { return null; }
        async create(d: any) { return d; }
        async update(d: any) { return d; }
    },
}));

vi.mock('../repositories/PostgresSportRepository.js', () => ({
    PostgresSportRepository: class {
        async findAll() { return []; }
        async findById() { return null; }
        async create(d: any) { return d; }
        async update(d: any) { return d; }
        async delete() {}
    },
}));

vi.mock('../repositories/PostgresEnrollmentRepository.js', () => ({
    PostgresEnrollmentRepository: class {
        async findAll() { return []; }
        async create(d: any) { return d; }
    },
}));

// UUIDs fijos para los préstamos de prueba.
// El controlador valida el formato UUID (RFC 4122) antes de llamar al repositorio:
//   - 3er grupo empieza con [1-5] (versión)
//   - 4to grupo empieza con [89ab] (variante)
// Todos los IDs usados en las URLs deben cumplir esta restricción.
const UUID_ACTIVE   = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
const UUID_RETURNED = 'b1ffcd00-0d1c-4aa9-8b7e-7cc0ce491b22';
const UUID_DELETED  = 'c2aade11-1e2d-4bb8-9c8f-8dd1df5a2c33';

// Estado en memoria compartido entre todos los métodos del mock.
// Al inicializarlo con un préstamo activo y uno ya eliminado,
// podemos probar los casos de borde sin depender del orden de ejecución.
const loansInMemory: Record<string, any> = {
    [UUID_ACTIVE]: {
        id: UUID_ACTIVE,
        itemName: 'Pelota de Básquet Spalding',
        status: EquipmentLoanStatus.Loaned,
        loanDate: new Date('2026-05-01T10:00:00Z'),
        dueDate: new Date('2099-12-31T10:00:00Z'), // Siempre futura
        memberId: 'member-pleno',
        deletedAt: null,
    },
    [UUID_RETURNED]: {
        id: UUID_RETURNED,
        itemName: 'Raqueta de Tenis',
        status: EquipmentLoanStatus.Returned,
        loanDate: new Date('2026-04-01T10:00:00Z'),
        dueDate: new Date('2099-12-31T10:00:00Z'),
        memberId: 'member-pleno',
        deletedAt: null,
    },
    [UUID_DELETED]: {
        id: UUID_DELETED,
        itemName: 'Conos de Entrenamiento',
        status: EquipmentLoanStatus.Loaned,
        loanDate: new Date('2026-03-01T10:00:00Z'),
        dueDate: new Date('2099-12-31T10:00:00Z'),
        memberId: 'member-pleno',
        deletedAt: new Date('2026-03-15T10:00:00Z'), // Ya dado de baja
    },
};

vi.mock('../repositories/PostgresEquipmentLoanRepository.js', async () => {
    // Importamos la entidad real para que findById devuelva instancias con sus métodos de dominio.
    // Esto es necesario porque el UseCase llama updateInfo(), changeStatus() y delete()
    // sobre el objeto devuelto por findById.
    const { EquipmentLoan } = await import('../../domain/entities/EquipmentLoan.js');

    return {
        PostgresEquipmentLoanRepository: class {
            async save(loan: any) {
                loansInMemory[loan.id] = loan;
            }

            async findAll() {
                return Object.values(loansInMemory).filter((l) => l.deletedAt === null);
            }

            async findById(id: string) {
                const data = loansInMemory[id];
                // Replica el comportamiento real: filtra eliminados lógicamente
                if (!data || data.deletedAt !== null) return null;
                // Reconstruye una instancia real de dominio (igual que el PersistenceMapper)
                return new EquipmentLoan(
                    data.id,
                    data.itemName,
                    data.status,
                    data.loanDate,
                    data.dueDate,
                    data.memberId,
                    data.deletedAt,
                );
            }

            async update(loan: any) {
                loansInMemory[loan.id] = loan;
            }
        },
    };
});

vi.mock('../repositories/PostgresMemberRepository.js', () => {
    return {
        PostgresMemberRepository: class {
            async findById(id: string) {
                const members: Record<string, any> = {
                    'member-pleno': { id: 'member-pleno', name: 'Socio Pleno', category: 'Pleno' },
                    'member-cadete': { id: 'member-cadete', name: 'Socio Cadete', category: 'Cadete' },
                };
                return members[id] ?? null;
            }
        },
    };
});

// ──────────────────────────────────────────────────────────────────────────────

describe('EquipmentLoan API — Integration Tests', () => {
    let app: FastifyInstance;

    beforeAll(async () => {
        app = buildApp();
        await app.ready();
    });

    afterAll(async () => {
        await app.close();
    });

    // ──────────────────────────────────────────
    // POST /api/v1/equipment-loans
    // TDD-0016: Casos de borde en la creación
    // ──────────────────────────────────────────

    describe('POST /api/v1/equipment-loans', () => {

        // I-01: Socio con categoría Cadete — no autorizado
        // Provoca fallo forzado en la interfaz: el socio existe pero no tiene permiso.
        it('I-01: debe retornar 403 si el socio tiene categoría Cadete', async () => {
            // Given: payload con socio Cadete y fecha futura válida
            const payload = {
                itemName: 'Pelota de Fútbol',
                dueDate: new Date('2099-12-31T10:00:00Z').toISOString(),
                memberId: 'member-cadete',
            };

            // When
            const response = await app.inject({
                method: 'POST',
                url: '/api/v1/equipment-loans',
                payload,
            });

            // Then
            expect(response.statusCode).toBe(403);
            const body = JSON.parse(response.payload);
            expect(body.error).toBe('Los socios categoría Cadete no tienen permitido solicitar material.');
        });

        // I-02: Fecha de devolución en el pasado — frontera temporal
        // Exprimir parámetros de interfaz: valor extremo inferior de dueDate.
        it('I-02: debe retornar 400 si dueDate es una fecha pasada', async () => {
            // Given: fecha de devolución en el pasado (1 día atrás)
            const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
            const payload = {
                itemName: 'Pelota de Fútbol',
                dueDate: pastDate,
                memberId: 'member-pleno',
            };

            // When
            const response = await app.inject({
                method: 'POST',
                url: '/api/v1/equipment-loans',
                payload,
            });

            // Then
            expect(response.statusCode).toBe(400);
            const body = JSON.parse(response.payload);
            expect(body.error).toBe('La fecha de devolución debe ser posterior a la fecha actual.');
        });

        // I-03: Campos obligatorios faltantes — validación de contrato de API
        // Exprime el límite inferior de parámetros: body sin campos requeridos.
        it('I-03: debe retornar 400 si faltan los campos obligatorios itemName o dueDate', async () => {
            // Given: body sin itemName ni dueDate
            const payload = { memberId: 'member-pleno' };

            // When
            const response = await app.inject({
                method: 'POST',
                url: '/api/v1/equipment-loans',
                payload,
            });

            // Then
            expect(response.statusCode).toBe(400);
            const body = JSON.parse(response.payload);
            expect(body.error).toBe('Los campos itemName y dueDate son requeridos.');
        });
    });

    // ──────────────────────────────────────────
    // PATCH /api/v1/equipment-loans/:id
    // TDD-0017: Casos de borde en la actualización
    // ──────────────────────────────────────────

    describe('PATCH /api/v1/equipment-loans/:id', () => {

        // I-04: Regresión de estado prohibida (Returned → Loaned)
        // Provoca fallo forzado en la interfaz de la máquina de estados.
        it('I-04: debe retornar 409 al intentar cambiar el estado de Returned a Loaned', async () => {
            // Given: UUID_RETURNED ya está en estado Returned en el mock
            const payload = { status: EquipmentLoanStatus.Loaned };

            // When
            const response = await app.inject({
                method: 'PATCH',
                url: `/api/v1/equipment-loans/${UUID_RETURNED}`,
                payload,
            });

            // Then
            expect(response.statusCode).toBe(409);
            const body = JSON.parse(response.payload);
            expect(body.error).toBe("No se puede cambiar el estado a 'Prestado' si el préstamo ya fue finalizado.");
        });

        // I-05: Formato de ID inválido en la URL
        // Exprime el parámetro de ruta con un valor que no cumple el formato UUID.
        it('I-05: debe retornar 400 si el :id de la URL no tiene formato UUID válido', async () => {
            // Given: ID no UUID en la URL
            const response = await app.inject({
                method: 'PATCH',
                url: '/api/v1/equipment-loans/id-no-es-un-uuid',
                payload: { itemName: 'Nuevo nombre' },
            });

            // Then
            expect(response.statusCode).toBe(400);
            const body = JSON.parse(response.payload);
            expect(body.error).toBe('El parámetro ID de la URL no tiene un formato válido.');
        });
    });

    // ──────────────────────────────────────────
    // DELETE /api/v1/equipment-loans/:id
    // TDD-0018: Casos de borde en la baja lógica
    // ──────────────────────────────────────────

    describe('DELETE /api/v1/equipment-loans/:id', () => {

        // I-06: Préstamo ya eliminado — doble baja lógica
        // El repositorio devuelve null para préstamos con deletedAt != null,
        // simulando exactamente el comportamiento del repositorio real.
        it('I-06: debe retornar 404 al intentar eliminar un préstamo que ya fue dado de baja', async () => {
            // Given: UUID_DELETED ya tiene deletedAt asignado → findById devuelve null

            // When
            const response = await app.inject({
                method: 'DELETE',
                url: `/api/v1/equipment-loans/${UUID_DELETED}`,
            });

            // Then
            expect(response.statusCode).toBe(404);
            const body = JSON.parse(response.payload);
            expect(body.error).toBe('El préstamo que intenta eliminar no se encuentra registrado.');
        });
    });
});
