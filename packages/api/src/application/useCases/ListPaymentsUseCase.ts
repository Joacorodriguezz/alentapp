import { PaymentFilters } from '@alentapp/shared';
import { IPaymentRepository } from '../ports/IPaymentRepository.js';
import { Payment } from '../../domain/entities/Payment.js';

export class ListPaymentsUseCase {
    constructor(private readonly paymentRepository: IPaymentRepository) {}

    async execute(filters?: PaymentFilters): Promise<Payment[]> {
        return this.paymentRepository.findAll(filters);
    }
}
