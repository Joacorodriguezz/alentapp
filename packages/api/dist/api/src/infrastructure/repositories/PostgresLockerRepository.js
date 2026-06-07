import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../generated/client/client.js';
import { LockerPersistenceMapper } from '../mappers/LockerPersistenceMapper.js';
if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is not set');
}
const prisma = new PrismaClient({
    adapter: new PrismaPg(process.env.DATABASE_URL),
});
export class PostgresLockerRepository {
    async create(locker) {
        const createdLocker = await prisma.locker.create({
            data: LockerPersistenceMapper.ToPersistence(locker),
        });
        return LockerPersistenceMapper.ToDomain(createdLocker);
    }
    async findByNumber(number) {
        const locker = await prisma.locker.findUnique({
            where: { number },
        });
        return locker ? LockerPersistenceMapper.ToDomain(locker) : null;
    }
    async findAll() {
        const lockers = await prisma.locker.findMany({
            orderBy: { number: 'asc' },
        });
        return lockers.map(LockerPersistenceMapper.ToDomain);
    }
    async findById(id) {
        const locker = await prisma.locker.findUnique({
            where: { id },
        });
        return locker ? LockerPersistenceMapper.ToDomain(locker) : null;
    }
    async delete(id) {
        await prisma.locker.delete({
            where: { id },
        });
    }
    async update(id, data) {
        const updatedLocker = await prisma.locker.update({
            where: { id },
            data,
        });
        return LockerPersistenceMapper.ToDomain(updatedLocker);
    }
}
