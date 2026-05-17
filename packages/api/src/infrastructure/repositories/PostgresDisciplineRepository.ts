import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../generated/client/client.js';
import { IDisciplineRepository } from '../../application/ports/IDisciplineRepository.js';
import { DisciplineResponse, CreateDisciplineRequest, DisciplineFilters } from '@alentapp/shared';

if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is not set');
}

const prisma = new PrismaClient({
    adapter: new PrismaPg(process.env.DATABASE_URL),
});

type DBDiscipline = {
    id: string;
    reason: string;
    startDate: Date;
    endDate: Date;
    isTotalSuspension: boolean;
    memberId: string;
    deletedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
};

export class PostgresDisciplineRepository implements IDisciplineRepository {
    async create(data: CreateDisciplineRequest): Promise<DisciplineResponse> {
        const discipline = await prisma.discipline.create({
            data: {
                reason: data.reason,
                startDate: new Date(data.startDate),
                endDate: new Date(data.endDate),
                isTotalSuspension: data.isTotalSuspension,
                memberId: data.memberId,
            },
        });

        return this.mapToDTO(discipline);
    }

    async findAll(filters?: DisciplineFilters): Promise<DisciplineResponse[]> {
        const where: { memberId?: string; deletedAt?: null } = {};

        if (filters?.memberId) {
            where.memberId = filters.memberId;
        }
        if (filters?.onlyActive) {
            where.deletedAt = null;
        }

        const disciplines = await prisma.discipline.findMany({
            where,
            orderBy: { createdAt: 'desc' },
        });

        return disciplines.map((discipline) => this.mapToDTO(discipline));
    }

    async findById(id: string): Promise<DisciplineResponse | null> {
        const discipline = await prisma.discipline.findUnique({
            where: { id },
        });

        if (!discipline) {
            return null;
        }

        return this.mapToDTO(discipline);
    }

    private mapToDTO(discipline: DBDiscipline): DisciplineResponse {
        return {
            id: discipline.id,
            reason: discipline.reason,
            startDate: discipline.startDate.toISOString().split('T')[0],
            endDate: discipline.endDate.toISOString().split('T')[0],
            isTotalSuspension: discipline.isTotalSuspension,
            memberId: discipline.memberId,
            deletedAt: discipline.deletedAt ? discipline.deletedAt.toISOString() : null,
            createdAt: discipline.createdAt.toISOString(),
            updatedAt: discipline.updatedAt.toISOString(),
        };
    }
}
