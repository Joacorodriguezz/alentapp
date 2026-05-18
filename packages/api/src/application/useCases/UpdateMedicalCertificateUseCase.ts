import { IMedicalCertificateRepository } from '../ports/IMedicalCertificateRepository.js';
import { MedicalCertificate } from '../../domain/entities/MedicalCertificate.js';
import { UpdateMedicalCertificateRequest } from '@alentapp/shared';

export class UpdateMedicalCertificateUseCase {
    constructor(
        private readonly medicalCertificateRepository: IMedicalCertificateRepository,
    ) {}

    async execute(id: string, data: UpdateMedicalCertificateRequest): Promise<MedicalCertificate> {
        const existing = await this.medicalCertificateRepository.findById(id);
        if (!existing) {
            throw new Error('Certificado no encontrado');
        }

        const effectiveIssue = data.issueDate ?? existing.issueDate;
        const effectiveExpiry = data.expiryDate ?? existing.expiryDate;

        MedicalCertificate.validateDates(effectiveIssue, effectiveExpiry);

        return this.medicalCertificateRepository.update(id, data);
    }
}
