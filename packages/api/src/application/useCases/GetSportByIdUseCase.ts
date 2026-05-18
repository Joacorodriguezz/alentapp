import { ISportRepository } from '../ports/ISportRepository.js';
import { Sport } from '../../domain/entities/Sport.js';

export class GetSportByIdUseCase {
    constructor(private readonly sportRepository: ISportRepository) {}

    async execute(id: string): Promise<Sport> {
        const sport = await this.sportRepository.findById(id);

        if (!sport) {
            throw new Error('Deporte no encontrado');
        }

        return sport;
    }
}
