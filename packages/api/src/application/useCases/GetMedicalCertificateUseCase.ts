import { IMedicalCertificateRepository } from '../ports/IMedicalCertificateRepository.js';
import { IMemberRepository } from '../ports/IMemberRepository.js';
import { MedicalCertificate } from '../../domain/entities/MedicalCertificate.js';

export interface GetCertificateResult {
    certificate: MedicalCertificate;
    dni: string;
}

export class GetMedicalCertificateUseCase {
    constructor(
        private readonly certificateRepo: IMedicalCertificateRepository,
        private readonly memberRepo: IMemberRepository,
    ) {}

    async execute(id: string): Promise<GetCertificateResult> {
        const cert = await this.certificateRepo.findById(id);
        if (!cert) {
            throw new Error('El recurso solicitado no existe');
        }

        // Resolver DNI del socio a partir del UUID interno del certificado
        const member = await this.memberRepo.findById(cert.memberId);
        const dni = member?.dni ?? '';

        return { certificate: cert, dni };
    }
}
