import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../generated/client/client.js';
import { MemberMapper } from '../mappers/MemberMapper.js';
if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is not set');
}
const prisma = new PrismaClient({
    adapter: new PrismaPg(process.env.DATABASE_URL),
});
export class PostgresMemberRepository {
    async create(data) {
        const member = await prisma.member.create({
            data: {
                dni: data.dni,
                name: data.name,
                email: data.email,
                birthdate: new Date(data.birthdate),
                category: data.category,
                status: data.status,
                created_at: new Date(data.created_at),
            },
        });
        return MemberMapper.fromDB(member);
    }
    async findById(id) {
        const member = await prisma.member.findUnique({
            where: { id },
        });
        return member ? MemberMapper.fromDB(member) : null;
    }
    async findByDni(dni) {
        const member = await prisma.member.findUnique({
            where: { dni },
        });
        return member ? MemberMapper.fromDB(member) : null;
    }
    async findAll() {
        const members = await prisma.member.findMany({
            orderBy: { created_at: 'desc' },
        });
        return members.map(MemberMapper.fromDB);
    }
    async update(id, data) {
        const member = await prisma.member.update({
            where: { id },
            data: {
                ...(data.dni && { dni: data.dni }),
                ...(data.name && { name: data.name }),
                ...(data.email && { email: data.email }),
                ...(data.birthdate && { birthdate: new Date(data.birthdate) }),
                ...(data.category && { category: data.category }),
                ...(data.status && { status: data.status }),
            },
        });
        return MemberMapper.fromDB(member);
    }
    async delete(id) {
        await prisma.member.delete({
            where: { id },
        });
    }
}
