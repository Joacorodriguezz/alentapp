export class GetMembersUseCase {
    memberRepo;
    constructor(memberRepo) {
        this.memberRepo = memberRepo;
    }
    async execute() {
        return this.memberRepo.findAll();
    }
}
