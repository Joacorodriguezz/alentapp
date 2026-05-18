import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../generated/client/client.js';
import { IEquipmentLoanRepository } from '../../application/ports/IEquipmentLoanRepository.js';
import { EquipmentLoan } from '../../domain/entities/EquipmentLoan.js';
import { EquipmentLoanPersistenceMapper } from '../mappers/EquipmentLoanPersistenceMapper.js';

if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is not set');
}

const prisma = new PrismaClient({
    adapter: new PrismaPg(process.env.DATABASE_URL),
});

export class PostgresEquipmentLoanRepository implements IEquipmentLoanRepository {
  async save(loan: EquipmentLoan): Promise<void> {
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

  async findById(id: string): Promise<EquipmentLoan | null> {
    const record = await prisma.equipmentLoan.findUnique({ where: { id } });
    return record ? EquipmentLoanPersistenceMapper.toDomain(record) : null;
  }

  async update(loan: EquipmentLoan): Promise<void> {
    const data = EquipmentLoanPersistenceMapper.toPersistence(loan);

    await prisma.equipmentLoan.update({
      where: { id: data.id },
      data: {
        itemName: data.itemName,
        status: data.status,
        dueDate: data.dueDate,
      }
    });
  }
}