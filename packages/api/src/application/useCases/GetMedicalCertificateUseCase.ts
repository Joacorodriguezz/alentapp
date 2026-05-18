import { IMedicalCertificateRepository } from '../ports/IMedicalCertificateRepository.js';
import { MedicalCertificate } from '../../domain/entities/MedicalCertificate.js';

export class GetMedicalCertificateUseCase {
    constructor(private readonly certificateRepo: IMedicalCertificateRepository) {}

    async execute(id: string): Promise<MedicalCertificate> {
        const cert = await this.certificateRepo.findById(id);
        if (!cert) {
            throw new Error('El recurso solicitado no existe');
        }
        return cert;
    }
}
