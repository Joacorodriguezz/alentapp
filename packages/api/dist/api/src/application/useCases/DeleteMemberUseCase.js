export class DeleteMemberUseCase {
    memberRepo;
    constructor(memberRepo) {
        this.memberRepo = memberRepo;
    }
    async execute(id) {
        const existingMember = await this.memberRepo.findById(id);
        if (!existingMember) {
            throw new Error('El miembro no existe');
        }
        await this.memberRepo.delete(id);
    }
}
