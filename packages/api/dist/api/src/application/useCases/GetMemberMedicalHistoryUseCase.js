export class GetMemberMedicalHistoryUseCase {
    certificateRepo;
    memberRepo;
    constructor(certificateRepo, memberRepo) {
        this.certificateRepo = certificateRepo;
        this.memberRepo = memberRepo;
    }
    async execute(dni, soloVigente) {
        // Resolver el UUID interno del socio a partir de su DNI público
        const member = await this.memberRepo.findByDni(dni);
        if (!member) {
            throw new Error('Socio no encontrado');
        }
        const certs = soloVigente
            ? await this.certificateRepo.findActiveByMember(member.id)
            : await this.certificateRepo.findAllByMember(member.id);
        return { certs, dni: member.dni };
    }
}
