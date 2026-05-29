export interface MedicalCertificate {
    id: string;             // UUID del certificado (necesario para edición y baja)
    issueDate: string;
    expiryDate: string;
    doctorLicence: string;
    institution: string;
    isValidated: boolean;
    dni: string;            // DNI del socio — el memberId UUID nunca se expone
}
