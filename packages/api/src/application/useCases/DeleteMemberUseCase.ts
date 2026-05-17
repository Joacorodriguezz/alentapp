import { MemberRepository } from '../ports/IMemberRepository.js';

export class DeleteMemberUseCase {
    constructor(private readonly memberRepo: MemberRepository) {}

    async execute(id: string): Promise<void> {
        const existingMember = await this.memberRepo.findById(id);
        if (!existingMember) {
            throw new Error('El miembro no existe');
        }

        await this.memberRepo.delete(id);
    }
}
