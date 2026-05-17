import { IPaymentRepository } from '../ports/IPaymentRepository.js';
import { Payment } from '../../domain/entities/Payment.js';

export class GetPaymentsUseCase {
    constructor(private readonly repository: IPaymentRepository) {}

    async execute(): Promise<Payment[]> {
        return await this.repository.findAll();
    }
}
