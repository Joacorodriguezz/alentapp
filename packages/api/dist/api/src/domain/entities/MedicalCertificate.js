export class MedicalCertificate {
    id;
    // Campos editables según TDD-0021 (issueDate, expiryDate, doctorLicence, institution)
    issueDate;
    expiryDate;
    doctorLicence;
    institution;
    // Mutable para soportar la transición de estado invalidate() (TDD-0028)
    isValidated;
    memberId;
    constructor(id, issueDate, expiryDate, doctorLicence, institution, isValidated, memberId) {
        this.id = id;
        this.issueDate = issueDate;
        this.expiryDate = expiryDate;
        this.doctorLicence = doctorLicence;
        this.institution = institution;
        this.isValidated = isValidated;
        this.memberId = memberId;
    }
    static parseDate(dateStr) {
        if (!dateStr)
            return new Date(NaN);
        if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) {
            const [day, month, year] = dateStr.split('/');
            return new Date(`${year}-${month}-${day}T12:00:00Z`);
        }
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
            return new Date(`${dateStr}T12:00:00Z`);
        }
        return new Date(dateStr);
    }
    /**
     * Valida que los campos obligatorios del certificado no sean nulos ni vacíos.
     * Invariante propia de la entidad (TDD-0020).
     */
    static validateRequiredFields(data) {
        if (!data.issueDate || !data.expiryDate || !data.doctorLicence || !data.institution || !data.memberId) {
            throw new Error('Datos inválidos');
        }
    }
    /**
     * Valida que expiryDate sea estrictamente posterior a issueDate.
     * Método canónico único. Mensaje alineado con TDD-0020.
     * El use case de update es responsable de traducir el mensaje al contexto de TDD-0021.
     */
    static validateDates(issueDate, expiryDate) {
        const issue = MedicalCertificate.parseDate(issueDate);
        const expiry = MedicalCertificate.parseDate(expiryDate);
        if (isNaN(issue.getTime()) || isNaN(expiry.getTime())) {
            throw new Error('Datos inválidos');
        }
        if (expiry <= issue) {
            throw new Error('La fecha de fin debe ser posterior a la de inicio');
        }
    }
    /**
     * Factory method: valida invariantes y construye los datos iniciales del certificado.
     * Establece isValidated: true como estado inicial (TDD-0020).
     */
    static create(data) {
        MedicalCertificate.validateRequiredFields(data);
        MedicalCertificate.validateDates(data.issueDate, data.expiryDate);
        return {
            issueDate: data.issueDate,
            expiryDate: data.expiryDate,
            doctorLicence: data.doctorLicence,
            institution: data.institution,
            isValidated: true, // Estado inicial definido por TDD-0020
            memberId: data.memberId,
        };
    }
    /**
     * Transición de estado: marca el certificado como anulado.
     * Baja lógica definida por TDD-0028.
     */
    invalidate() {
        this.isValidated = false;
    }
}
