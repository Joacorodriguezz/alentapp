import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../generated/client/client.js';
import type { IPaymentRepository } from '../../application/ports/IPaymentRepository.js';
import { PaymentFilters } from '@alentapp/shared';
import { Payment } from '../../domain/entities/Payment.js';
import { PaymentMapper } from '../mappers/PaymentMapper.js';

if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is not set');
}

const prisma = new PrismaClient({
    adapter: new PrismaPg(process.env.DATABASE_URL),
});

export class PostgresPaymentRepository implements IPaymentRepository {
    async save(payment: Payment): Promise<Payment> {
        const data = PaymentMapper.toPersistence(payment);

        const record = await prisma.payment.create({
            data: {
                id: data.id,
                amount: data.amount,
                description: data.description,
                status: data.status,
                paymentDate: data.paymentDate,
                memberId: data.memberId,
                deletedAt: data.deletedAt,
            },
        });

        return PaymentMapper.fromDB(record);
    }

    async findById(id: string): Promise<Payment | null> {
        const payment = await prisma.payment.findFirst({
            where: { id, deletedAt: null },
        });
        return payment ? PaymentMapper.fromDB(payment) : null;
    }

    async findByIdIncludeDeleted(id: string): Promise<Payment | null> {
        const payment = await prisma.payment.findFirst({ where: { id } });
        return payment ? PaymentMapper.fromDB(payment) : null;
    }

    async findAll(filters?: PaymentFilters): Promise<Payment[]> {
        const payments = await prisma.payment.findMany({
            where: {
                deletedAt: null,
                ...(filters?.memberId ? { memberId: filters.memberId } : {}),
                ...(filters?.status ? { status: filters.status } : {}),
            },
            orderBy: { createdAt: 'desc' },
        });
        return payments.map(PaymentMapper.fromDB);
    }

    async update(payment: Payment): Promise<Payment> {
        const data = PaymentMapper.toPersistence(payment);

        const record = await prisma.payment.update({
            where: { id: data.id },
            data: {
                amount: data.amount,
                description: data.description,
                status: data.status,
                deletedAt: data.deletedAt,
            },
        });

        return PaymentMapper.fromDB(record);
    }
}
