import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../generated/client/client.js';
import { SportMapper } from '../mappers/SportMapper.js';
if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is not set');
}
const prisma = new PrismaClient({
    adapter: new PrismaPg(process.env.DATABASE_URL),
});
export class PostgresSportRepository {
    async create(sport) {
        const createdSport = await prisma.sport.create({
            data: SportMapper.toPersistence(sport),
        });
        return SportMapper.fromDB(createdSport);
    }
    async findAll(filters) {
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
    async findById(id) {
        const sport = await prisma.sport.findUnique({
            where: { id },
        });
        return sport ? SportMapper.fromDB(sport) : null;
    }
    async findByName(name) {
        const sport = await prisma.sport.findUnique({
            where: { name },
        });
        return sport ? SportMapper.fromDB(sport) : null;
    }
    async update(id, sport) {
        const updatedSport = await prisma.sport.update({
            where: { id },
            data: SportMapper.toPersistence(sport),
        });
        return SportMapper.fromDB(updatedSport);
    }
    async delete(id) {
        await prisma.sport.delete({
            where: { id },
        });
    }
}
