import { MedicalCertificate } from '../../domain/entities/MedicalCertificate.js';
import { UpdateMedicalCertificateRequest } from '@alentapp/shared';

export interface IMedicalCertificateRepository {
    save(data: Omit<MedicalCertificate, 'id' | 'isValidated'>): Promise<MedicalCertificate>;
    invalidatePreviousCertificates(memberId: string): Promise<void>;
    findById(id: string): Promise<MedicalCertificate | null>;
    findAllByMember(memberId: string): Promise<MedicalCertificate[]>;
    findActiveByMember(memberId: string): Promise<MedicalCertificate[]>;
    update(id: string, data: UpdateMedicalCertificateRequest): Promise<MedicalCertificate>;
    logicalDelete(id: string): Promise<void>;
}
