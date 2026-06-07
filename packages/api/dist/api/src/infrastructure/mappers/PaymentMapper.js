import { Payment } from '../../domain/entities/Payment.js';
export class PaymentMapper {
    static fromDB(record) {
        return new Payment(record.id, parseFloat(record.amount.toString()), record.description, record.status, record.paymentDate.toISOString(), record.memberId, record.deletedAt ? record.deletedAt.toISOString() : null, record.createdAt.toISOString(), record.updatedAt.toISOString());
    }
    static toPersistence(payment) {
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
    static toDTO(payment) {
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
