import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CreatePaymentUseCase } from '../useCases/CreatePaymentUseCase.js';
import { IPaymentRepository } from '../ports/IPaymentRepository.js';
import { MemberRepository } from '../ports/IMemberRepository.js';
import { Member } from '../../domain/entities/Member.js';
import { Payment } from '../../domain/entities/Payment.js';
import { CreatePaymentRequest } from '@alentapp/shared';

describe('CreatePaymentUseCase', () => {
    const mockPaymentRepo = {
        save: vi.fn(),
    } as unknown as IPaymentRepository;

    const mockMemberRepo = {
        findById: vi.fn(),
    } as unknown as MemberRepository;

    const useCase = new CreatePaymentUseCase(mockPaymentRepo, mockMemberRepo);

    const mockMember = new Member(
        'member-1',
        '12345678',
        'Juan Perez',
        'juan@test.com',
        '1990-01-01',
        'Pleno',
        'Activo',
        '2026-04-20T00:00:00.000Z',
    );

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('debe crear un pago exitosamente si el socio existe', async () => {
        const mockRequest: CreatePaymentRequest = {
            amount: 150,
            description: 'Cuota mensual',
            paymentDate: '2026-05-01',
            memberId: 'member-1',
        };

        vi.mocked(mockMemberRepo.findById).mockResolvedValueOnce(mockMember);
        vi.mocked(mockPaymentRepo.save).mockImplementation(async (payment: Payment) => payment);

        const result = await useCase.execute(mockRequest);

        expect(mockMemberRepo.findById).toHaveBeenCalledWith('member-1');
        expect(mockPaymentRepo.save).toHaveBeenCalledWith(
            expect.objectContaining({
                amount: 150,
                status: 'Pending',
                memberId: 'member-1',
            }),
        );
        expect(result.status).toBe('Pending');
        expect(result.amount).toBe(150);
    });

    it('debe lanzar error si el socio no existe', async () => {
        const mockRequest: CreatePaymentRequest = {
            amount: 150,
            paymentDate: '2026-05-01',
            memberId: 'member-inexistente',
        };

        vi.mocked(mockMemberRepo.findById).mockResolvedValueOnce(null);

        await expect(useCase.execute(mockRequest)).rejects.toThrow(
            'El socio indicado no existe',
        );
        expect(mockPaymentRepo.save).not.toHaveBeenCalled();
    });
});
