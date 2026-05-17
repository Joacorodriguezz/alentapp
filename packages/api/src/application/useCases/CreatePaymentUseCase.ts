import { IPaymentRepository } from '../ports/IPaymentRepository.js';
import { MemberRepository } from '../ports/IMemberRepository.js';
import { Payment } from '../../domain/entities/Payment.js';
import { CreatePaymentRequest } from '@alentapp/shared';

export class CreatePaymentUseCase {
    constructor(
        private readonly paymentRepository: IPaymentRepository,
        private readonly memberRepository: MemberRepository,
    ) {}

    async execute(data: CreatePaymentRequest): Promise<Payment> {
        Payment.validateAmount(data.amount);
        Payment.validatePaymentDate(data.paymentDate);

        const member = await this.memberRepository.findById(data.memberId);
        if (!member) {
            throw new Error('El socio indicado no existe');
        }

        return this.paymentRepository.save({
            amount: data.amount,
            description: data.description ?? null,
            status: 'Pending',
            paymentDate: data.paymentDate,
            memberId: data.memberId,
            deletedAt: null,
        });
    }
}
