import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../generated/client/client.js';
import type { IMedicalCertificateRepository } from '../../application/ports/IMedicalCertificateRepository.js';
import { MedicalCertificate } from '../../domain/entities/MedicalCertificate.js';
import { MedicalCertificateMapper } from '../mappers/MedicalCertificateMapper.js';
import { UpdateMedicalCertificateRequest } from '@alentapp/shared';

if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is not set');
}

const prisma = new PrismaClient({
    adapter: new PrismaPg(process.env.DATABASE_URL),
});

export class PostgresMedicalCertificateRepository implements IMedicalCertificateRepository {
    async save(data: Omit<MedicalCertificate, 'id' | 'isValidated'>): Promise<MedicalCertificate> {
        const cert = await prisma.medicalCertificate.create({
            data: {
                issueDate: MedicalCertificate.parseDate(data.issueDate),
                expiryDate: MedicalCertificate.parseDate(data.expiryDate),
                doctorLicence: data.doctorLicence,
                institution: data.institution,
                isValidated: true,
                memberId: data.memberId
            }
        });
        return MedicalCertificateMapper.fromDB(cert);
    }

    async invalidatePreviousCertificates(memberId: string): Promise<void> {
        await prisma.medicalCertificate.updateMany({
            where: {
                memberId,
                isValidated: true
            },
            data: {
                isValidated: false
            }
        });
    }

    async findById(id: string): Promise<MedicalCertificate | null> {
        const cert = await prisma.medicalCertificate.findUnique({ where: { id } });
        return cert ? MedicalCertificateMapper.fromDB(cert) : null;
    }

    async findAllByMember(memberId: string): Promise<MedicalCertificate[]> {
        const certs = await prisma.medicalCertificate.findMany({ where: { memberId } });
        return certs.map(MedicalCertificateMapper.fromDB);
    }

    async findActiveByMember(memberId: string): Promise<MedicalCertificate[]> {
        const certs = await prisma.medicalCertificate.findMany({ where: { memberId, isValidated: true } });
        return certs.map(MedicalCertificateMapper.fromDB);
    }

    async logicalDelete(id: string): Promise<void> {
        await prisma.medicalCertificate.update({
            where: { id },
            data: { isValidated: false },
        });
    }

    async update(id: string, data: UpdateMedicalCertificateRequest): Promise<MedicalCertificate> {
        try {
            const cert = await prisma.medicalCertificate.update({
                where: { id },
                data: {
                    // issueDate también se aplica de forma condicional, igual que los campos opcionales
                    ...(data.issueDate !== undefined && { issueDate: new Date(data.issueDate) }),
                    ...(data.expiryDate !== undefined && { expiryDate: new Date(data.expiryDate) }),
                    ...(data.doctorLicence !== undefined && { doctorLicence: data.doctorLicence }),
                    ...(data.institution !== undefined && { institution: data.institution }),
                }
            });
            return MedicalCertificateMapper.fromDB(cert);
        } catch (error: any) {
            // P2025 = registro no encontrado durante el update (race condition post-findById)
            if (error.code === 'P2025') {
                throw new Error('Certificado no encontrado');
            }
            throw error;
        }
    }
}
