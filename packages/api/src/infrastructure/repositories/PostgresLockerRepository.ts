import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../generated/client/client.js';
import { Locker } from '../../domain/entities/Locker.js';
import { ILockerRepository, UpdateLockerData } from '../../application/ports/ILockerRepository.js';
import { LockerPersistenceMapper } from '../mappers/LockerPersistenceMapper.js';

if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is not set');
}

const prisma = new PrismaClient({
    adapter: new PrismaPg(process.env.DATABASE_URL),
});

export class PostgresLockerRepository implements ILockerRepository {
    async create(locker: Locker): Promise<Locker> {
        const createdLocker = await prisma.locker.create({
            data: LockerPersistenceMapper.ToPersistence(locker),
        });

        return LockerPersistenceMapper.ToDomain(createdLocker);
    }

    async findByNumber(number: number): Promise<Locker | null> {
        const locker = await prisma.locker.findUnique({
            where: { number },
        });

        return locker ? LockerPersistenceMapper.ToDomain(locker) : null;
    }

    async findAll(): Promise<Locker[]> {
        const lockers = await prisma.locker.findMany({
            orderBy: { number: 'asc' },
        });

        return lockers.map(LockerPersistenceMapper.ToDomain);
    }

    async findById(id: string): Promise<Locker | null> {
        const locker = await prisma.locker.findUnique({
            where: { id },
        });

        return locker ? LockerPersistenceMapper.ToDomain(locker) : null;
    }

    async update(id: string, data: UpdateLockerData): Promise<Locker> {
        const updatedLocker = await prisma.locker.update({
            where: { id },
            data,
        });

        return LockerPersistenceMapper.ToDomain(updatedLocker);
    }
}
