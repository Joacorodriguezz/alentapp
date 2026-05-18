import { IMedicalCertificateRepository } from '../ports/IMedicalCertificateRepository.js';

export class DeleteMedicalCertificateUseCase {
    constructor(private readonly certificateRepo: IMedicalCertificateRepository) {}

    async execute(id: string): Promise<void> {
        const cert = await this.certificateRepo.findById(id);
        if (!cert) {
            throw new Error('Certificado no encontrado');
        }
        await this.certificateRepo.logicalDelete(id);
    }
}
