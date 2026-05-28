import { IPaymentRepository } from '../ports/IPaymentRepository.js';
import { Payment } from '../../domain/entities/Payment.js';

export class DeletePaymentUseCase {
    constructor(private readonly paymentRepository: IPaymentRepository) {}

    async execute(id: string): Promise<Payment> {
        const payment = await this.paymentRepository.findByIdIncludeDeleted(id);
        if (!payment) {
            throw new Error('El pago indicado no existe');
        }

        payment.cancel();

        return this.paymentRepository.update(payment);
    }
}
