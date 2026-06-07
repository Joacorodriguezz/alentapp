export class DeleteMedicalCertificateUseCase {
    certificateRepo;
    constructor(certificateRepo) {
        this.certificateRepo = certificateRepo;
    }
    async execute(id) {
        const cert = await this.certificateRepo.findById(id);
        if (!cert) {
            throw new Error('Certificado no encontrado');
        }
        // La entidad expresa la transición de estado (TDD-0028)
        cert.invalidate();
        // El repositorio persiste el cambio de estado
        await this.certificateRepo.logicalDelete(id);
    }
}
