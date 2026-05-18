import { IMedicalCertificateRepository } from '../ports/IMedicalCertificateRepository.js';
import { MedicalCertificate } from '../../domain/entities/MedicalCertificate.js';

export class GetMemberMedicalHistoryUseCase {
    constructor(private readonly certificateRepo: IMedicalCertificateRepository) {}

    async execute(memberId: string, soloVigente?: boolean): Promise<MedicalCertificate[]> {
        if (soloVigente) {
            return this.certificateRepo.findActiveByMember(memberId);
        }
        return this.certificateRepo.findAllByMember(memberId);
    }
}
