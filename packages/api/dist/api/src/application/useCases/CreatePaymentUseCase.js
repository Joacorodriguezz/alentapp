import { Payment } from '../../domain/entities/Payment.js';
export class CreatePaymentUseCase {
    paymentRepository;
    memberRepository;
    constructor(paymentRepository, memberRepository) {
        this.paymentRepository = paymentRepository;
        this.memberRepository = memberRepository;
    }
    async execute(data) {
        const member = await this.memberRepository.findById(data.memberId);
        if (!member) {
            throw new Error('El socio indicado no existe');
        }
        const payment = Payment.create(crypto.randomUUID(), data.amount, data.description ?? null, data.paymentDate, data.memberId);
        return this.paymentRepository.save(payment);
    }
}
