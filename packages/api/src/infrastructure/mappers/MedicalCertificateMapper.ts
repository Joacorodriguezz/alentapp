import { MedicalCertificateDTO } from '@alentapp/shared';
import { MedicalCertificate } from '../../domain/entities/MedicalCertificate.js';

export type DBMedicalCertificate = {
    id: string;
    issueDate: Date;
    expiryDate: Date;
    doctorLicence: string;
    institution: string;
    isValidated: boolean;
    memberId: string;
};

export class MedicalCertificateMapper {
    static fromDB(record: DBMedicalCertificate): MedicalCertificate {
        return new MedicalCertificate(
            record.id,
            record.issueDate.toISOString(),
            record.expiryDate.toISOString(),
            record.doctorLicence,
            record.institution,
            record.isValidated,
            record.memberId,
        );
    }

    static toDTO(cert: MedicalCertificate): MedicalCertificateDTO {
        return {
            id: cert.id,
            issueDate: cert.issueDate,
            expiryDate: cert.expiryDate,
            doctorLicence: cert.doctorLicence,
            institution: cert.institution,
            isValidated: cert.isValidated,
            memberId: cert.memberId,
        };
    }
}
