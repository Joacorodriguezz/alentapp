import { IMedicalCertificateRepository } from '../ports/IMedicalCertificateRepository.js';
import { IMemberRepository } from '../ports/IMemberRepository.js';
import { MedicalCertificate } from '../../domain/entities/MedicalCertificate.js';
import { CreateMedicalCertificateRequest } from '@alentapp/shared';

export class CreateMedicalCertificateUseCase {
    constructor(
        private readonly medicalCertificateRepository: IMedicalCertificateRepository,
        private readonly memberRepository: IMemberRepository,
    ) {}

    async execute(data: CreateMedicalCertificateRequest): Promise<MedicalCertificate> {
        // Validate inputs
        MedicalCertificate.validate(data);

        // Check if member exists
        const member = await this.memberRepository.findById(data.memberId);
        if (!member) {
            throw new Error('Socio no encontrado');
        }

        // Invalidate previous active certificates for this member
        await this.medicalCertificateRepository.invalidatePreviousCertificates(data.memberId);

        // Save new certificate (valid by default)
        return this.medicalCertificateRepository.save({
            issueDate: data.issueDate,
            expiryDate: data.expiryDate,
            doctorLicence: data.doctorLicence,
            institution: data.institution,
            memberId: data.memberId
        });
    }
}
