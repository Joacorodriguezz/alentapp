import { Member } from '../../domain/entities/Member.js';
export class UpdateMemberUseCase {
    memberRepo;
    memberValidator;
    constructor(memberRepo, memberValidator) {
        this.memberRepo = memberRepo;
        this.memberValidator = memberValidator;
    }
    async execute(id, data) {
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
        }
        else if (birthdateStr && Member.isMinor(birthdateStr)) {
            finalData.category = 'Cadete';
        }
        return this.memberRepo.update(id, finalData);
    }
}
