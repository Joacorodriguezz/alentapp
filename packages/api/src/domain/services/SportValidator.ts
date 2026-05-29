import { ISportRepository } from '../../application/ports/ISportRepository.js';

export class SportValidator {
    constructor(private readonly sportRepository: ISportRepository) {}

    async validateNameIsUnique(name: string): Promise<void> {
        const sport = await this.sportRepository.findByName(name);
        if (sport) {
            throw new Error('El deporte ya existe');
        }
    }
}
