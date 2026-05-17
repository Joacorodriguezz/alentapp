import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../generated/client/client.js';
import type { IPaymentRepository } from '../../application/ports/IPaymentRepository.js';
import { PaymentDTO, PaymentFilters, PaymentStatus } from '@alentapp/shared';
import { Payment } from '../../domain/entities/Payment.js';
import { PaymentMapper } from '../mappers/PaymentMapper.js';

if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is not set');
}

const prisma = new PrismaClient({
    adapter: new PrismaPg(process.env.DATABASE_URL),
});

export class PostgresPaymentRepository implements IPaymentRepository {
    async save(data: Omit<PaymentDTO, 'id' | 'createdAt' | 'updatedAt'>): Promise<Payment> {
        const payment = await prisma.payment.create({
            data: {
                amount: data.amount,
                description: data.description,
                status: data.status,
                paymentDate: new Date(data.paymentDate),
                memberId: data.memberId,
                deletedAt: null,
            },
        });
        return PaymentMapper.fromDB(payment);
    }

    async findById(id: string): Promise<Payment | null> {
        const payment = await prisma.payment.findFirst({
            where: { id, deletedAt: null },
        });
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

    async update(id: string, data: { amount?: number; description?: string | null; status?: PaymentStatus }): Promise<Payment> {
        const payment = await prisma.payment.update({
            where: { id },
            data: {
                ...(data.amount !== undefined && { amount: data.amount }),
                ...(data.description !== undefined && { description: data.description }),
                ...(data.status !== undefined && { status: data.status }),
            },
        });
        return PaymentMapper.fromDB(payment);
    }
}
