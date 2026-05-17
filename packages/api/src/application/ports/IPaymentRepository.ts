import { PaymentDTO, PaymentFilters, PaymentStatus } from '@alentapp/shared';
import { Payment } from '../../domain/entities/Payment.js';

export interface IPaymentRepository {
    save(data: Omit<PaymentDTO, 'id' | 'createdAt' | 'updatedAt'>): Promise<Payment>;
    findById(id: string): Promise<Payment | null>;
    findAll(filters?: PaymentFilters): Promise<Payment[]>;
    update(id: string, data: { amount?: number; description?: string | null; status?: PaymentStatus }): Promise<Payment>;
}
