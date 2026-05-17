export interface MedicalCertificateDTO {
    id: string;
    issueDate: string;       // ISO Date String
    expiryDate: string;      // ISO Date String
    doctorLicence: string;
    institution: string;
    isValidated: boolean;
    memberId: string;
}

export interface CreateMedicalCertificateRequest {
    issueDate: string;       // ISO Date String
    expiryDate: string;      // ISO Date String
    doctorLicence: string;
    institution: string;
    memberId: string;        // UUID del socio
}
