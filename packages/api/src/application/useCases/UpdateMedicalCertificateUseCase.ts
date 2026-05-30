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

        // Combinar datos del request con los valores existentes para calcular el rango efectivo
        const effectiveIssue = data.issueDate ?? existing.issueDate;
        const effectiveExpiry = data.expiryDate ?? existing.expiryDate;

        // Validar rango vía la entidad; traducir al mensaje de TDD-0021 (opción A)
        try {
            MedicalCertificate.validateDates(effectiveIssue, effectiveExpiry);
        } catch {
            throw new Error('La fecha de vencimiento no puede ser anterior a la de la emisión');
        }

        const certificate = await this.medicalCertificateRepository.update(id, data);

        // Resolver DNI del socio para la respuesta pública (no exponer UUID)
        const member = await this.memberRepository.findById(certificate.memberId);
        const dni = member?.dni ?? '';

        return { certificate, dni };
    }
}

