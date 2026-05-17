import { MemberRepository } from '../ports/IMemberRepository.js';
import { Member } from '../../domain/entities/Member.js';

export class GetMembersUseCase {
    constructor(private readonly memberRepo: MemberRepository) {}

    async execute(): Promise<Member[]> {
        return this.memberRepo.findAll();
    }
}
