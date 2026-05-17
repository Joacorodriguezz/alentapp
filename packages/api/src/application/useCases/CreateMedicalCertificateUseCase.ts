import { IMedicalCertificateRepository } from '../ports/IMedicalCertificateRepository.js';
import { IMemberRepository } from '../ports/IMemberRepository.js';
import { MedicalCertificate } from '../../domain/entities/MedicalCertificate.js';
import { CreateMedicalCertificateRequest } from '@alentapp/shared';

export class CreateMedicalCertificateUseCase {
    constructor(
        private readonly certRepo: IMedicalCertificateRepository,
        private readonly memberRepo: IMemberRepository,
    ) {}

    async execute(data: CreateMedicalCertificateRequest): Promise<MedicalCertificate> {
        MedicalCertificate.validateDates(data.issueDate, data.expiryDate);

        const member = await this.memberRepo.findById(data.memberId);
        if (!member) {
            throw new Error('Socio no encontrado');
        }

        await this.certRepo.invalidatePreviousCertificates(data.memberId);

        return this.certRepo.save({ ...data, isValidated: true });
    }
}
