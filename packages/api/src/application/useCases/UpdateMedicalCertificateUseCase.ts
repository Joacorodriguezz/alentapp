import { IMedicalCertificateRepository } from '../ports/IMedicalCertificateRepository.js';
import { IMemberRepository } from '../ports/IMemberRepository.js';
import { MedicalCertificate } from '../../domain/entities/MedicalCertificate.js';
import { UpdateMedicalCertificateRequest } from '@alentapp/shared';

export interface UpdateCertificateResult {
    certificate: MedicalCertificate;
    dni: string;
}

export class UpdateMedicalCertificateUseCase {
    constructor(
        private readonly medicalCertificateRepository: IMedicalCertificateRepository,
        private readonly memberRepository: IMemberRepository,
    ) {}

    async execute(id: string, data: UpdateMedicalCertificateRequest): Promise<UpdateCertificateResult> {
        const existing = await this.medicalCertificateRepository.findById(id);
        if (!existing) {
            throw new Error('Certificado no encontrado');
        }

        const effectiveIssue = data.issueDate ?? existing.issueDate;
        const effectiveExpiry = data.expiryDate ?? existing.expiryDate;

        MedicalCertificate.validateDates(effectiveIssue, effectiveExpiry);

        const certificate = await this.medicalCertificateRepository.update(id, data);

        // Resolver DNI del socio para la respuesta pública (no exponer UUID)
        const member = await this.memberRepository.findById(certificate.memberId);
        const dni = member?.dni ?? '';

        return { certificate, dni };
    }
}
