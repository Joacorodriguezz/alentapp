import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../generated/client/client.js';
import type { IPaymentRepository } from '../../application/ports/IPaymentRepository.js';
import { CreatePaymentRequest } from '@alentapp/shared';
import { Payment } from '../../domain/entities/Payment.js';
import { PaymentMapper } from '../mappers/PaymentMapper.js';

if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is not set');
}

const prisma = new PrismaClient({
    adapter: new PrismaPg(process.env.DATABASE_URL),
});

export class PostgresPaymentRepository implements IPaymentRepository {
    async save(data: Omit<Payment, 'id' | 'createdAt' | 'updatedAt'>): Promise<Payment> {
        const payment = await prisma.payment.create({
            data: {
                amount: data.amount,
                description: data.description,
                status: data.status,
                paymentDate: new Date(data.paymentDate),
                memberId: data.memberId,
                deletedAt: data.deletedAt ? new Date(data.deletedAt) : null,
            },
        });

        return PaymentMapper.fromDB(payment);
    }

    async findAll(): Promise<Payment[]> {
        const payments = await prisma.payment.findMany({
            orderBy: { paymentDate: 'desc' },
        });

        return payments.map(PaymentMapper.fromDB);
    }
}
