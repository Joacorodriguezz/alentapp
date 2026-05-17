import { MedicalCertificate } from '../../domain/entities/MedicalCertificate.js';
import { CreateMedicalCertificateRequest } from '@alentapp/shared';

export interface IMedicalCertificateRepository {
    save(data: CreateMedicalCertificateRequest & { isValidated: boolean }): Promise<MedicalCertificate>;
    invalidatePreviousCertificates(memberId: string): Promise<void>;
    findAll(): Promise<MedicalCertificate[]>;
}
