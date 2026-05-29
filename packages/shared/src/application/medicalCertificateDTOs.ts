export interface CreateMedicalCertificateRequest {
    issueDate: string;      // ISO Date String
    expiryDate: string;     // ISO Date String
    doctorLicence: string;
    institution: string;
    dni: string;            // DNI del socio (nunca UUID)
}

export interface UpdateMedicalCertificateRequest {
    issueDate: string;      // ISO Date String
    expiryDate?: string;    // ISO Date String
    doctorLicence?: string;
    institution?: string;
}
