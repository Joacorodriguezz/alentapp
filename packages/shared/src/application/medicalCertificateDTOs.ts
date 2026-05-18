export interface CreateMedicalCertificateRequest {
    issueDate: string;      // ISO Date String
    expiryDate: string;     // ISO Date String
    doctorLicence: string;
    institution: string;
    memberId: string;       // UUID del socio
}
