import { MemberRepository } from '../../application/ports/IMemberRepository.js';

export class MemberValidator {
    constructor(private readonly memberRepo: MemberRepository) {}

    async validateDniIsUnique(dni: string, excludeMemberId?: string): Promise<void> {
        const memberWithSameDni = await this.memberRepo.findByDni(dni);
        if (memberWithSameDni && memberWithSameDni.id !== excludeMemberId) {
            throw new Error('Ya existe un miembro con ese DNI');
        }
    }
}
