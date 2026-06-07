import { MedicalCertificate as DomainMedicalCertificate } from '../../domain/entities/MedicalCertificate.js';
export class MedicalCertificateMapper {
    static fromDB(record) {
        return new DomainMedicalCertificate(record.id, record.issueDate.toISOString(), record.expiryDate.toISOString(), record.doctorLicence, record.institution, record.isValidated, record.memberId);
    }
    /**
     * Mapea la entidad de dominio (que contiene UUIDs internos) al DTO público.
     * @param entity Entidad de dominio interna
     * @param dni    DNI del socio — el memberId (UUID del socio) nunca se expone
     */
    static toShared(entity, dni) {
        return {
            id: entity.id, // UUID del certificado — necesario para PUT/DELETE
            issueDate: entity.issueDate,
            expiryDate: entity.expiryDate,
            doctorLicence: entity.doctorLicence,
            institution: entity.institution,
            isValidated: entity.isValidated,
            dni, // DNI del socio — el memberId UUID nunca se expone
        };
    }
}
