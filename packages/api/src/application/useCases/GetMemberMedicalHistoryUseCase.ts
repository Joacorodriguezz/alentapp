import { IMedicalCertificateRepository } from '../ports/IMedicalCertificateRepository.js';
import { IMemberRepository } from '../ports/IMemberRepository.js';
import { MedicalCertificate } from '../../domain/entities/MedicalCertificate.js';

export interface MedicalHistoryResult {
    certs: MedicalCertificate[];
    dni: string;
}

export class GetMemberMedicalHistoryUseCase {
    constructor(
        private readonly certificateRepo: IMedicalCertificateRepository,
        private readonly memberRepo: IMemberRepository,
    ) {}

    async execute(dni: string, soloVigente?: boolean): Promise<MedicalHistoryResult> {
        // Resolver el UUID interno del socio a partir de su DNI público
        const member = await this.memberRepo.findByDni(dni);
        if (!member) {
            throw new Error('Socio no encontrado');
        }

        const certs = soloVigente
            ? await this.certificateRepo.findActiveByMember(member.id)
            : await this.certificateRepo.findAllByMember(member.id);

        return { certs, dni: member.dni };
    }
}
