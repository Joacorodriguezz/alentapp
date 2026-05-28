import { PaymentFilters } from '@alentapp/shared';
import { Payment } from '../../domain/entities/Payment.js';

export interface IPaymentRepository {
    save(payment: Payment): Promise<Payment>;
    findById(id: string): Promise<Payment | null>;
    findByIdIncludeDeleted(id: string): Promise<Payment | null>;
    findAll(filters?: PaymentFilters): Promise<Payment[]>;
    update(payment: Payment): Promise<Payment>;
}
