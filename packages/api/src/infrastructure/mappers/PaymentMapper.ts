import { PaymentDTO, PaymentStatus } from '@alentapp/shared';
import { Payment } from '../../domain/entities/Payment.js';

export type DBPayment = {
    id: string;
    amount: { toString(): string };
    description: string | null;
    status: PaymentStatus;
    paymentDate: Date;
    memberId: string;
    deletedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
};

export type PaymentPersistenceData = {
    id: string;
    amount: number;
    description: string | null;
    status: PaymentStatus;
    paymentDate: Date;
    memberId: string;
    deletedAt: Date | null;
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

    static toPersistence(payment: Payment): PaymentPersistenceData {
        return {
            id: payment.id,
            amount: payment.amount,
            description: payment.description,
            status: payment.status,
            paymentDate: new Date(payment.paymentDate),
            memberId: payment.memberId,
            deletedAt: payment.deletedAt ? new Date(payment.deletedAt) : null,
        };
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
