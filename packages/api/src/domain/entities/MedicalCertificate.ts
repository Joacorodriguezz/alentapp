export class MedicalCertificate {
    constructor(
        readonly id: string,
        readonly issueDate: string,
        readonly expiryDate: string,
        readonly doctorLicence: string,
        readonly institution: string,
        readonly isValidated: boolean,
        readonly memberId: string,
    ) {}

    static validateDates(issueDate: string, expiryDate: string): void {
        if (new Date(expiryDate) <= new Date(issueDate)) {
            throw new Error('La fecha de fin debe ser posterior a la de inicio');
        }
    }
}
