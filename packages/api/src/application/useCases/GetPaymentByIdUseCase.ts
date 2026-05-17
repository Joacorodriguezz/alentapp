import { IPaymentRepository } from '../ports/IPaymentRepository.js';
import { Payment } from '../../domain/entities/Payment.js';

export class GetPaymentByIdUseCase {
    constructor(private readonly paymentRepository: IPaymentRepository) {}

    async execute(id: string): Promise<Payment> {
        const payment = await this.paymentRepository.findById(id);
        if (!payment) {
            throw new Error('El pago indicado no existe');
        }
        return payment;
    }
}
