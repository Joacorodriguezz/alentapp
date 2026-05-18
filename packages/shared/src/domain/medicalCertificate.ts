export interface MedicalCertificate {
    id: string;
    issueDate: string;
    expiryDate: string;
    doctorLicence: string;
    institution: string;
    isValidated: boolean;
    memberId: string;
}
