import { PaymentStatus } from '../domain/payment.js';

export interface PaymentDTO {
    id: string;
    amount: number;
    description: string | null;
    status: PaymentStatus;
    paymentDate: string;
    memberId: string;
    deletedAt: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface CreatePaymentRequest {
    amount: number;
    description?: string;
    paymentDate: string;
    memberId: string;
}
