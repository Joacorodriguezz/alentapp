import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../../app.js';
import { CreatePaymentRequest, PaymentDTO, PaymentFilters } from '@alentapp/shared';


const SEED_PAYMENT_ID = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
const EXISTING_MEMBER_ID = '11111111-2222-3333-4444-555555555555';
const NON_EXISTENT_MEMBER_ID = '99999999-9999-9999-9999-999999999999';

type PaymentRecord = PaymentDTO;

// Mockeamos los repositorios para testear la integración sin BD real
// Esto nos permite testear: Fastify -> Controller -> UseCase -> Domain -> (Mocked Repo)
vi.mock('../repositories/PostgresPaymentRepository.js', async () => {
    const { Payment } = await import('../../domain/entities/Payment.js');

    const seedPaymentId = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
    const existingMemberId = '11111111-2222-3333-4444-555555555555';

    const paymentsInMemory: Record<string, PaymentRecord> = {
        [seedPaymentId]: {
            id: seedPaymentId,
            amount: 1500,
            description: 'Cuota mensual',
            status: 'Pending',
            paymentDate: '2026-05-01T10:00:00.000Z',
            memberId: existingMemberId,
            deletedAt: null,
            createdAt: '2026-05-01T10:00:00.000Z',
            updatedAt: '2026-05-01T10:00:00.000Z',
        },
    };

    function toPaymentEntity(record: PaymentRecord): InstanceType<typeof Payment> {
        return new Payment(
            record.id,
            record.amount,
            record.description,
            record.status,
            record.paymentDate,
            record.memberId,
            record.deletedAt,
            record.createdAt,
            record.updatedAt,
        );
    }

    function syncFromEntity(payment: InstanceType<typeof Payment>): PaymentRecord {
        const now = new Date().toISOString();
        const existing = paymentsInMemory[payment.id];
        const record: PaymentRecord = {
            id: payment.id,
            amount: payment.amount,
            description: payment.description,
            status: payment.status,
            paymentDate: payment.paymentDate,
            memberId: payment.memberId,
            deletedAt: payment.deletedAt,
            createdAt: existing?.createdAt ?? now,
            updatedAt: now,
        };
        paymentsInMemory[payment.id] = record;
        return record;
    }

    return {
        PostgresPaymentRepository: class {
            async save(payment: InstanceType<typeof Payment>): Promise<InstanceType<typeof Payment>> {
                syncFromEntity(payment);
                return toPaymentEntity(paymentsInMemory[payment.id]);
            }

            async findById(id: string): Promise<InstanceType<typeof Payment> | null> {
                const record = paymentsInMemory[id];
                if (!record || record.deletedAt !== null) {
                    return null;
                }
                return toPaymentEntity(record);
            }

            async findByIdIncludeDeleted(id: string): Promise<InstanceType<typeof Payment> | null> {
                const record = paymentsInMemory[id];
                return record ? toPaymentEntity(record) : null;
            }

            async findAll(filters?: PaymentFilters): Promise<InstanceType<typeof Payment>[]> {
                let result = Object.values(paymentsInMemory).filter(
                    (payment) => payment.deletedAt === null,
                );

                if (filters?.memberId) {
                    result = result.filter((payment) => payment.memberId === filters.memberId);
                }

                if (filters?.status) {
                    result = result.filter((payment) => payment.status === filters.status);
                }

                return result.map(toPaymentEntity);
            }

            async update(payment: InstanceType<typeof Payment>): Promise<InstanceType<typeof Payment>> {
                syncFromEntity(payment);
                return toPaymentEntity(paymentsInMemory[payment.id]);
            }
        },
    };
});

vi.mock('../repositories/PostgresMemberRepository.js', () => {
    const existingMemberId = '11111111-2222-3333-4444-555555555555';

    return {
        PostgresMemberRepository: class {
            async findById(id: string) {
                return id === existingMemberId ? { id, name: 'Juan Pérez' } : null;
            }
        },
    };
});

describe('Payment API Integration Tests', () => {
    let app: FastifyInstance;

    beforeAll(async () => {
        app = buildApp();
        await app.ready();
    });

    afterAll(async () => {
        await app.close();
    });

    describe('GET /api/v1/payments', () => {
        it('debe retornar código 200 y el listado de pagos', async () => {
            const response = await app.inject({
                method: 'GET',
                url: '/api/v1/payments',
            });

            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.payload);
            expect(body.data).toBeInstanceOf(Array);
            expect(body.data.length).toBeGreaterThan(0);
            expect(body.data[0].id).toBe(SEED_PAYMENT_ID);
            expect(body.data[0].amount).toBe(1500);
        });
    });

    describe('GET /api/v1/payments/:id', () => {
        it('debe retornar código 200 y los datos de un pago por ID', async () => {
            const response = await app.inject({
                method: 'GET',
                url: `/api/v1/payments/${SEED_PAYMENT_ID}`,
            });

            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.payload);
            expect(body.data.id).toBe(SEED_PAYMENT_ID);
            expect(body.data.amount).toBe(1500);
            expect(body.data.memberId).toBe(EXISTING_MEMBER_ID);
        });
    });

    describe('POST /api/v1/payments', () => {
        it('debe retornar 201 y crear un pago con estado Pending', async () => {
            const payload: CreatePaymentRequest = {
                amount: 2000,
                description: 'Cuota anual',
                paymentDate: '2026-06-01T10:00:00.000Z',
                memberId: EXISTING_MEMBER_ID,
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
            expect(body.data.memberId).toBe(EXISTING_MEMBER_ID);
            expect(body.data.id).toBeDefined();
        });

        it('debe retornar 404 si el socio no existe', async () => {
            const payload: CreatePaymentRequest = {
                amount: 1000,
                paymentDate: '2026-06-01T10:00:00.000Z',
                memberId: NON_EXISTENT_MEMBER_ID,
            };

            const response = await app.inject({
                method: 'POST',
                url: '/api/v1/payments',
                payload,
            });

            expect(response.statusCode).toBe(404);
            const body = JSON.parse(response.payload);
            expect(body.error).toBe('El socio indicado no existe');
        });
    });

    describe('PUT /api/v1/payments/:id', () => {
        it('debe retornar 200 y confirmar un pago como Paid', async () => {
            const response = await app.inject({
                method: 'PUT',
                url: `/api/v1/payments/${SEED_PAYMENT_ID}`,
                payload: { status: 'Paid' },
            });

            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.payload);
            expect(body.data.id).toBe(SEED_PAYMENT_ID);
            expect(body.data.status).toBe('Paid');
        });
    });

    describe('DELETE /api/v1/payments/:id', () => {
        it('debe retornar 200 y cancelar un pago pendiente', async () => {
            const createPayload: CreatePaymentRequest = {
                amount: 500,
                paymentDate: '2026-06-01T10:00:00.000Z',
                memberId: EXISTING_MEMBER_ID,
            };

            const createResponse = await app.inject({
                method: 'POST',
                url: '/api/v1/payments',
                payload: createPayload,
            });

            const createdId = JSON.parse(createResponse.payload).data.id as string;

            const response = await app.inject({
                method: 'DELETE',
                url: `/api/v1/payments/${createdId}`,
            });

            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.payload);
            expect(body.data.status).toBe('Canceled');
            expect(body.data.deletedAt).not.toBeNull();
        });
    });
});
