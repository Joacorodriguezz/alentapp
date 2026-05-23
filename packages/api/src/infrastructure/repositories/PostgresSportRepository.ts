import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../generated/client/client.js';
import type { SportFilters } from '@alentapp/shared';
import { ISportRepository } from '../../application/ports/ISportRepository.js';
import { Sport } from '../../domain/entities/Sport.js';
import { SportMapper } from '../mappers/SportMapper.js';
import type { SportFilters } from '@alentapp/shared';

if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is not set');
}

const prisma = new PrismaClient({
    adapter: new PrismaPg(process.env.DATABASE_URL),
});

export class PostgresSportRepository implements ISportRepository {
    async create(sport: Sport): Promise<Sport> {
        const createdSport = await prisma.sport.create({
            data: SportMapper.toPersistence(sport),
        });

        return SportMapper.fromDB(createdSport);
    }

    async findAll(filters?: SportFilters): Promise<Sport[]> {
        const sports = await prisma.sport.findMany({
            where: {
                ...(filters?.requiresMedicalCertificate !== undefined && {
                    requiresMedicalCertificate: filters.requiresMedicalCertificate,
                }),
            },
            orderBy: { name: 'asc' },
        });

        return sports.map(SportMapper.fromDB);
    }

    async findById(id: string): Promise<Sport | null> {
        const sport = await prisma.sport.findUnique({
            where: { id },
        });

        return sport ? SportMapper.fromDB(sport) : null;
    }

    async findByName(name: string): Promise<Sport | null> {
        const sport = await prisma.sport.findUnique({
            where: { name },
        });

        return sport ? SportMapper.fromDB(sport) : null;
    }

    async update(id: string, sport: Sport): Promise<Sport> {
        const updatedSport = await prisma.sport.update({
            where: { id },
            data: SportMapper.toPersistence(sport),
        });

        return SportMapper.fromDB(updatedSport);
    }

    async delete(id: string): Promise<void> {
        await prisma.sport.delete({
            where: { id },
        });
    }
}