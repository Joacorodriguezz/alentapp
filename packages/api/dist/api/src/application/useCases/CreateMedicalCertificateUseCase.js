import { MedicalCertificate } from '../../domain/entities/MedicalCertificate.js';
export class CreateMedicalCertificateUseCase {
    medicalCertificateRepository;
    memberRepository;
    constructor(medicalCertificateRepository, memberRepository) {
        this.medicalCertificateRepository = medicalCertificateRepository;
        this.memberRepository = memberRepository;
    }
    async execute(data) {
        // 1. Validar invariantes propias de la entidad antes de consultar BD (TDD-0020)
        //    memberId aún no está disponible; se validan solo los campos del request.
        if (!data.issueDate || !data.expiryDate || !data.doctorLicence || !data.institution) {
            throw new Error('Datos inválidos');
        }
        MedicalCertificate.validateDates(data.issueDate, data.expiryDate);
        // 2. Resolver el UUID interno del socio a partir de su DNI público (requiere BD)
        const member = await this.memberRepository.findByDni(data.dni);
        if (!member) {
            throw new Error('Socio no encontrado');
        }
        // 3. Construir datos del certificado vía factory (valida invariantes completas incluido memberId)
        const certData = MedicalCertificate.create({
            issueDate: data.issueDate,
            expiryDate: data.expiryDate,
            doctorLicence: data.doctorLicence,
            institution: data.institution,
            memberId: member.id, // UUID interno — nunca expuesto al cliente
        });
        // 4. Invalidar certificados activos previos del socio (TDD-0020: solo un certificado activo)
        await this.medicalCertificateRepository.invalidatePreviousCertificates(member.id);
        // 5. Persistir el nuevo certificado con isValidated: true definido por la entidad
        const certificate = await this.medicalCertificateRepository.save(certData);
        return { certificate, dni: member.dni };
    }
}
