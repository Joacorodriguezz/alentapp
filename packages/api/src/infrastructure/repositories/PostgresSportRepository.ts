import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../generated/client/client.js';
import { Sport } from '../../domain/entities/Sport.js';
import { SportRepository } from '../../domain/services/sportRepository.js';
import { SportPersistenceMapper } from '../mappers/SportPersistenceMapper.js';

export class PostgresSportRepository implements SportRepository {
    private prisma?: PrismaClient;

    async create(sport: Sport): Promise<Sport> {
        const createdSport = await this.getPrisma().sport.create({
            data: SportPersistenceMapper.toPersistence(sport),
        });

        return SportPersistenceMapper.toDomain(createdSport);
    }

    async findByName(name: string): Promise<Sport | null> {
        const sport = await this.getPrisma().sport.findUnique({
            where: { name },
        });

        return sport ? SportPersistenceMapper.toDomain(sport) : null;
    }

    private getPrisma(): PrismaClient {
        if (!process.env.DATABASE_URL) {
            throw new Error('DATABASE_URL environment variable is not set');
        }

        if (!this.prisma) {
            this.prisma = new PrismaClient({
                adapter: new PrismaPg(process.env.DATABASE_URL),
            });
        }

        return this.prisma;
    }
}