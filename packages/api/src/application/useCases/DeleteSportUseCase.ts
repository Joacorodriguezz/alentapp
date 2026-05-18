import { ISportRepository } from '../ports/ISportRepository.js';

export class DeleteSportUseCase {
    constructor(private readonly sportRepo: ISportRepository) {}

    async execute(id: string): Promise<void> {
        const sport = await this.sportRepo.findById(id);
        if (!sport) {
            throw new Error('Deporte no encontrado');
        }

        await this.sportRepo.delete(id);
    }
}