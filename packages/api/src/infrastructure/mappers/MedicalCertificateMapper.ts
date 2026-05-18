import { MedicalCertificate as DomainMedicalCertificate } from '../../domain/entities/MedicalCertificate.js';
import { MedicalCertificate as SharedMedicalCertificate } from '@alentapp/shared';

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
    static fromDB(record: DBMedicalCertificate): DomainMedicalCertificate {
        return new DomainMedicalCertificate(
            record.id,
            record.issueDate.toISOString(),
            record.expiryDate.toISOString(),
            record.doctorLicence,
            record.institution,
            record.isValidated,
            record.memberId
        );
    }

    static toShared(entity: DomainMedicalCertificate): SharedMedicalCertificate {
        return {
            id: entity.id,
            issueDate: entity.issueDate,
            expiryDate: entity.expiryDate,
            doctorLicence: entity.doctorLicence,
            institution: entity.institution,
            isValidated: entity.isValidated,
            memberId: entity.memberId
        };
    }
}
