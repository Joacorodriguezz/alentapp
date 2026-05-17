import { MemberRepository } from '../ports/IMemberRepository.js';
import { MemberValidator } from '../../domain/services/MemberValidator.js';
import { Member } from '../../domain/entities/Member.js';
import { CreateMemberRequest } from '@alentapp/shared';

export class CreateMemberUseCase {
    constructor(
        private readonly memberRepository: MemberRepository,
        private readonly memberValidator: MemberValidator
    ) {}

    async execute(data: CreateMemberRequest): Promise<Member> {
        if (!Member.isValidEmail(data.email)) {
            throw new Error('Formato de correo electrónico inválido');
        }
        await this.memberValidator.validateDniIsUnique(data.dni);

        const finalCategory = Member.resolveCategory(data.birthdate, data.category);

        return this.memberRepository.create({
            ...data,
            category: finalCategory,
            status: 'Activo',
            created_at: new Date().toISOString(),
        });
    }
}
