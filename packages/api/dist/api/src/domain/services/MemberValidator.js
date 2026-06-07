export class MemberValidator {
    memberRepo;
    constructor(memberRepo) {
        this.memberRepo = memberRepo;
    }
    async validateDniIsUnique(dni, excludeMemberId) {
        const memberWithSameDni = await this.memberRepo.findByDni(dni);
        if (memberWithSameDni && memberWithSameDni.id !== excludeMemberId) {
            throw new Error('Ya existe un miembro con ese DNI');
        }
    }
}
