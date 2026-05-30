import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UpdatePaymentUseCase } from '../useCases/UpdatePaymentUseCase.js';
import { IPaymentRepository } from '../ports/IPaymentRepository.js';
import { Payment } from '../../domain/entities/Payment.js';

describe('UpdatePaymentUseCase', () => {
    const mockPaymentRepo = {
        findByIdIncludeDeleted: vi.fn(),
        update: vi.fn(),
    } as unknown as IPaymentRepository;

    const useCase = new UpdatePaymentUseCase(mockPaymentRepo);

    const mockPendingPayment = Payment.create(
        'payment-1',
        100,
        'Cuota mensual',
        '2026-05-01',
        'member-1',
    );

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('debe lanzar error si el pago no existe', async () => {
        vi.mocked(mockPaymentRepo.findByIdIncludeDeleted).mockResolvedValueOnce(null);

        await expect(
            useCase.execute('payment-inexistente', { amount: 200 }),
        ).rejects.toThrow('El pago indicado no existe');
    });

    it('debe confirmar un pago como Paid cuando está Pending', async () => {
        vi.mocked(mockPaymentRepo.findByIdIncludeDeleted).mockResolvedValueOnce(
            mockPendingPayment,
        );
        vi.mocked(mockPaymentRepo.update).mockImplementation(async (payment: Payment) => payment);

        const result = await useCase.execute('payment-1', { status: 'Paid' });

        expect(mockPaymentRepo.update).toHaveBeenCalledWith(
            expect.objectContaining({ status: 'Paid' }),
        );
        expect(result.status).toBe('Paid');
    });
});
