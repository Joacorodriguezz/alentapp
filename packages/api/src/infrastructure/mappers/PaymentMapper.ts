import { PaymentDTO } from '@alentapp/shared';
import { Payment } from '../../domain/entities/Payment.js';

export type DBPayment = {
    id: string;
    amount: { toString(): string };
    description: string | null;
    status: 'Pending' | 'Paid' | 'Canceled';
    paymentDate: Date;
    memberId: string;
    deletedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
};

export class PaymentMapper {
    static fromDB(record: DBPayment): Payment {
        return new Payment(
            record.id,
            parseFloat(record.amount.toString()),
            record.description,
            record.status,
            record.paymentDate.toISOString(),
            record.memberId,
            record.deletedAt ? record.deletedAt.toISOString() : null,
            record.createdAt.toISOString(),
            record.updatedAt.toISOString(),
        );
    }

    static toDTO(payment: Payment): PaymentDTO {
        return {
            id: payment.id,
            amount: payment.amount,
            description: payment.description,
            status: payment.status,
            paymentDate: payment.paymentDate,
            memberId: payment.memberId,
            deletedAt: payment.deletedAt,
            createdAt: payment.createdAt,
            updatedAt: payment.updatedAt,
        };
    }
}
