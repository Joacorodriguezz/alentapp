import { IMedicalCertificateRepository } from '../ports/IMedicalCertificateRepository.js';
import { IMemberRepository } from '../ports/IMemberRepository.js';
import { MedicalCertificate } from '../../domain/entities/MedicalCertificate.js';
import { CreateMedicalCertificateRequest } from '@alentapp/shared';

export interface CreateCertificateResult {
    certificate: MedicalCertificate;
    dni: string;
}

export class CreateMedicalCertificateUseCase {
    constructor(
        private readonly medicalCertificateRepository: IMedicalCertificateRepository,
        private readonly memberRepository: IMemberRepository,
    ) {}

    async execute(data: CreateMedicalCertificateRequest): Promise<CreateCertificateResult> {
        // Validar campos obligatorios del DTO
        if (!data.issueDate || !data.expiryDate || !data.doctorLicence || !data.institution || !data.dni) {
            throw new Error('Datos inválidos');
        }

        // Validar rango de fechas con la lógica del dominio
        MedicalCertificate.validateDates(data.issueDate, data.expiryDate);

        // Resolver el UUID interno del socio a partir de su DNI público
        const member = await this.memberRepository.findByDni(data.dni);
        if (!member) {
            throw new Error('Socio no encontrado');
        }

        // Invalidar certificados activos previos del socio
        await this.medicalCertificateRepository.invalidatePreviousCertificates(member.id);

        // Persistir el nuevo certificado (isValidated: true por defecto)
        const certificate = await this.medicalCertificateRepository.save({
            issueDate: data.issueDate,
            expiryDate: data.expiryDate,
            doctorLicence: data.doctorLicence,
            institution: data.institution,
            memberId: member.id,   // UUID interno — nunca expuesto al cliente
        });

        return { certificate, dni: member.dni };
    }
}
