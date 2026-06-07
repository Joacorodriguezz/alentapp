import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../generated/client/client.js';
import { EquipmentLoanPersistenceMapper } from '../mappers/EquipmentLoanPersistenceMapper.js';
if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is not set');
}
const prisma = new PrismaClient({
    adapter: new PrismaPg(process.env.DATABASE_URL),
});
export class PostgresEquipmentLoanRepository {
    async save(loan) {
        const data = EquipmentLoanPersistenceMapper.toPersistence(loan);
        await prisma.equipmentLoan.create({
            data: {
                id: data.id,
                itemName: data.itemName,
                status: data.status,
                loanDate: data.loanDate,
                dueDate: data.dueDate,
                memberId: data.memberId,
                deletedAt: data.deletedAt
            }
        });
    }
    async findAll() {
        const records = await prisma.equipmentLoan.findMany({
            where: { deletedAt: null },
            orderBy: { loanDate: 'desc' }
        });
        return records.map(record => EquipmentLoanPersistenceMapper.toDomain(record));
    }
    async findById(id) {
        const record = await prisma.equipmentLoan.findFirst({
            where: { id, deletedAt: null }
        });
        return record ? EquipmentLoanPersistenceMapper.toDomain(record) : null;
    }
    async update(loan) {
        const data = EquipmentLoanPersistenceMapper.toPersistence(loan);
        await prisma.equipmentLoan.update({
            where: { id: data.id },
            data: {
                itemName: data.itemName,
                status: data.status,
                dueDate: data.dueDate,
                deletedAt: data.deletedAt
            }
        });
    }
}
