import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../generated/client/client.js';
import { ISportRepository } from '../../application/ports/ISportRepository.js';
import { Sport } from '../../domain/entities/Sport.js';
import { SportMapper } from '../mappers/SportMapper.js';

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

    async findByName(name: string): Promise<Sport | null> {
        const sport = await prisma.sport.findUnique({
            where: { name },
        });

        return sport ? SportMapper.fromDB(sport) : null;
    }
}
