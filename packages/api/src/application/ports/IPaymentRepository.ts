import { Payment } from '../../domain/entities/Payment.js';
import { CreatePaymentRequest } from '@alentapp/shared';

export interface IPaymentRepository {
    save(data: Omit<Payment, 'id' | 'createdAt' | 'updatedAt'>): Promise<Payment>;
    findAll(): Promise<Payment[]>;
}
