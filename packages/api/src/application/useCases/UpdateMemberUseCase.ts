import { MemberRepository } from '../ports/IMemberRepository.js';
import { MemberValidator } from '../../domain/services/MemberValidator.js';
import { Member } from '../../domain/entities/Member.js';
import { UpdateMemberRequest } from '@alentapp/shared';

export class UpdateMemberUseCase {
    constructor(
        private readonly memberRepo: MemberRepository,
        private readonly memberValidator: MemberValidator
    ) {}

    async execute(id: string, data: UpdateMemberRequest): Promise<Member> {
        const existingMember = await this.memberRepo.findById(id);
        if (!existingMember) {
            throw new Error('El miembro no existe');
        }

        if (data.email && !Member.isValidEmail(data.email)) {
            throw new Error('Formato de correo electrónico inválido');
        }

        if (data.dni && data.dni !== existingMember.dni) {
            await this.memberValidator.validateDniIsUnique(data.dni, id);
        }

        let finalData = { ...data };
        const birthdateStr = data.birthdate || existingMember.birthdate;
        if (birthdateStr && finalData.category) {
            finalData.category = Member.resolveCategory(birthdateStr, finalData.category);
        } else if (birthdateStr && Member.isMinor(birthdateStr)) {
            finalData.category = 'Cadete';
        }

        return this.memberRepo.update(id, finalData);
    }
}
