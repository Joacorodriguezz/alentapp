import { Member } from '../../domain/entities/Member.js';
export class CreateMemberUseCase {
    memberRepository;
    memberValidator;
    constructor(memberRepository, memberValidator) {
        this.memberRepository = memberRepository;
        this.memberValidator = memberValidator;
    }
    async execute(data) {
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
