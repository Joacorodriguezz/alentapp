import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../generated/client/client.js';
if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is not set');
}
const prisma = new PrismaClient({
    adapter: new PrismaPg(process.env.DATABASE_URL),
});
export class PostgresDisciplineRepository {
    async create(data) {
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
    async findAll(filters) {
        const where = {};
        if (filters?.memberId) {
            where.memberId = filters.memberId;
        }
        if (filters?.onlyActive) {
            where.deletedAt = null;
        }
        const disciplines = await prisma.discipline.findMany({
            where,
            orderBy: {
                createdAt: 'desc',
            },
        });
        return disciplines.map((discipline) => this.mapToDTO(discipline));
    }
    async findById(id) {
        const discipline = await prisma.discipline.findUnique({
            where: { id },
        });
        if (!discipline) {
            return null;
        }
        return this.mapToDTO(discipline);
    }
    async update(id, data) {
        const discipline = await prisma.discipline.update({
            where: { id },
            data: {
                reason: data.reason,
                startDate: new Date(data.startDate),
                endDate: new Date(data.endDate),
                isTotalSuspension: data.isTotalSuspension,
            },
        });
        return this.mapToDTO(discipline);
    }
    async softDelete(id) {
        await prisma.discipline.update({
            where: { id },
            data: { deletedAt: new Date() },
        });
    }
    mapToDTO(discipline) {
        return {
            id: discipline.id,
            reason: discipline.reason,
            startDate: discipline.startDate
                .toISOString(),
            endDate: discipline.endDate
                .toISOString(),
            isTotalSuspension: discipline.isTotalSuspension,
            memberId: discipline.memberId,
            deletedAt: discipline.deletedAt
                ? discipline.deletedAt.toISOString()
                : null,
            createdAt: discipline.createdAt.toISOString(),
            updatedAt: discipline.updatedAt.toISOString(),
        };
    }
}
