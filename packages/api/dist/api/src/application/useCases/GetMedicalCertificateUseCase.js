export class GetMedicalCertificateUseCase {
    certificateRepo;
    memberRepo;
    constructor(certificateRepo, memberRepo) {
        this.certificateRepo = certificateRepo;
        this.memberRepo = memberRepo;
    }
    async execute(id) {
        const cert = await this.certificateRepo.findById(id);
        if (!cert) {
            throw new Error('El recurso solicitado no existe');
        }
        // Resolver DNI del socio a partir del UUID interno del certificado
        const member = await this.memberRepo.findById(cert.memberId);
        const dni = member?.dni ?? '';
        return { certificate: cert, dni };
    }
}
