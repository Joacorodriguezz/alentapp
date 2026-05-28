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
        const member = await this.memberRepository.findById(data.memberId);
        if (!member) {
            throw new Error('El socio indicado no existe');
        }

        const payment = Payment.create(
            crypto.randomUUID(),
            data.amount,
            data.description ?? null,
            data.paymentDate,
            data.memberId,
        );

        return this.paymentRepository.save(payment);
    }
}
