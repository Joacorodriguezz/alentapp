import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../generated/client/client.js';
import type { IMedicalCertificateRepository } from '../../application/ports/IMedicalCertificateRepository.js';
import { MedicalCertificate } from '../../domain/entities/MedicalCertificate.js';
import { MedicalCertificateMapper } from '../mappers/MedicalCertificateMapper.js';

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
                issueDate: new Date(data.issueDate),
                expiryDate: new Date(data.expiryDate),
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
}
