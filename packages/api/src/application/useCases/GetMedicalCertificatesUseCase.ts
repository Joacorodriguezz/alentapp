import { IMedicalCertificateRepository } from '../ports/IMedicalCertificateRepository.js';
import { MedicalCertificate } from '../../domain/entities/MedicalCertificate.js';

export class GetMedicalCertificatesUseCase {
    constructor(private readonly repository: IMedicalCertificateRepository) {}

    async execute(): Promise<MedicalCertificate[]> {
        return await this.repository.findAll();
    }
}
