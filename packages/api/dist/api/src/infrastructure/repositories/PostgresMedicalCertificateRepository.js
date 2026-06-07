import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../generated/client/client.js';
import { MedicalCertificate } from '../../domain/entities/MedicalCertificate.js';
import { MedicalCertificateMapper } from '../mappers/MedicalCertificateMapper.js';
if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is not set');
}
const prisma = new PrismaClient({
    adapter: new PrismaPg(process.env.DATABASE_URL),
});
export class PostgresMedicalCertificateRepository {
    async save(data) {
        const cert = await prisma.medicalCertificate.create({
            data: {
                issueDate: MedicalCertificate.parseDate(data.issueDate),
                expiryDate: MedicalCertificate.parseDate(data.expiryDate),
                doctorLicence: data.doctorLicence,
                institution: data.institution,
                // isValidated proviene de la entidad (TDD-0020: true al crear)
                isValidated: data.isValidated,
                memberId: data.memberId,
            }
        });
        return MedicalCertificateMapper.fromDB(cert);
    }
    async invalidatePreviousCertificates(memberId) {
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
    async findById(id) {
        const cert = await prisma.medicalCertificate.findUnique({ where: { id } });
        return cert ? MedicalCertificateMapper.fromDB(cert) : null;
    }
    async findAllByMember(memberId) {
        const certs = await prisma.medicalCertificate.findMany({ where: { memberId } });
        return certs.map(MedicalCertificateMapper.fromDB);
    }
    async findActiveByMember(memberId) {
        const certs = await prisma.medicalCertificate.findMany({ where: { memberId, isValidated: true } });
        return certs.map(MedicalCertificateMapper.fromDB);
    }
    async logicalDelete(id) {
        await prisma.medicalCertificate.update({
            where: { id },
            data: { isValidated: false },
        });
    }
    async update(id, data) {
        try {
            const cert = await prisma.medicalCertificate.update({
                where: { id },
                data: {
                    ...(data.issueDate && { issueDate: new Date(data.issueDate) }),
                    ...(data.expiryDate && { expiryDate: new Date(data.expiryDate) }),
                    ...(data.issueDate !== undefined && { issueDate: new Date(data.issueDate) }),
                    ...(data.expiryDate !== undefined && { expiryDate: new Date(data.expiryDate) }),
                    ...(data.doctorLicence !== undefined && { doctorLicence: data.doctorLicence }),
                    ...(data.institution !== undefined && { institution: data.institution }),
                }
            });
            return MedicalCertificateMapper.fromDB(cert);
        }
        catch (error) {
            // P2025 = registro no encontrado durante el update (race condition post-findById)
            if (error.code === 'P2025') {
                throw new Error('Certificado no encontrado');
            }
            throw error;
        }
    }
}
