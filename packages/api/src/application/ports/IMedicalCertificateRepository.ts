import { MedicalCertificate } from '../../domain/entities/MedicalCertificate.js';

export interface IMedicalCertificateRepository {
    save(data: Omit<MedicalCertificate, 'id' | 'isValidated'>): Promise<MedicalCertificate>;
    invalidatePreviousCertificates(memberId: string): Promise<void>;
}
