export class MedicalCertificate {
    constructor(
        readonly id: string,
        readonly issueDate: string,
        readonly expiryDate: string,
        readonly doctorLicence: string,
        readonly institution: string,
        readonly isValidated: boolean,
        readonly memberId: string
    ) {}

    static validate(data: {
        issueDate: string;
        expiryDate: string;
        doctorLicence: string;
        institution: string;
        memberId: string;
    }): void {
        if (!data.issueDate || !data.expiryDate || !data.doctorLicence || !data.institution || !data.memberId) {
            throw new Error('Datos inválidos');
        }

        const issue = new Date(data.issueDate);
        const expiry = new Date(data.expiryDate);

        if (isNaN(issue.getTime()) || isNaN(expiry.getTime())) {
            throw new Error('Datos inválidos');
        }

        if (expiry <= issue) {
            throw new Error('La fecha de fin debe ser posterior a la de inicio');
        }
    }

    static validateDates(issueDate: string, expiryDate: string): void {
        const issue = new Date(issueDate);
        const expiry = new Date(expiryDate);

        // Fechas no parseables → error de datos inválidos (semánticamente distinto al error de rango)
        if (isNaN(issue.getTime()) || isNaN(expiry.getTime())) {
            throw new Error('Datos inválidos');
        }

        // Chequeo de rango con mensaje semánticamente correcto
        if (expiry <= issue) {
            throw new Error('La fecha de vencimiento no puede ser anterior a la de la emisión');
        }
    }
}
