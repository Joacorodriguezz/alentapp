import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DeletePaymentUseCase } from '../useCases/DeletePaymentUseCase.js';
import { IPaymentRepository } from '../ports/IPaymentRepository.js';
import { Payment } from '../../domain/entities/Payment.js';

describe('DeletePaymentUseCase', () => {
    const mockPaymentRepo = {
        findByIdIncludeDeleted: vi.fn(),
        update: vi.fn(),
    } as unknown as IPaymentRepository;

    const useCase = new DeletePaymentUseCase(mockPaymentRepo);

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

    it('debe cancelar el pago exitosamente si existe y está Pending', async () => {
        vi.mocked(mockPaymentRepo.findByIdIncludeDeleted).mockResolvedValueOnce(
            mockPendingPayment,
        );
        vi.mocked(mockPaymentRepo.update).mockImplementation(async (payment: Payment) => payment);

        const result = await useCase.execute('payment-1');

        expect(mockPaymentRepo.update).toHaveBeenCalledWith(
            expect.objectContaining({
                status: 'Canceled',
                deletedAt: expect.stringMatching(/^\d{4}-\d{2}-\d{2}/),
            }),
        );
        expect(result.status).toBe('Canceled');
        expect(result.deletedAt).not.toBeNull();
    });
});
