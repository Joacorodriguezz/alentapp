import type { UpdateSportRequest } from '@alentapp/shared';
import { ISportRepository } from '../ports/ISportRepository.js';
import { Sport } from '../../domain/entities/Sport.js';

export class UpdateSportUseCase {
    constructor(
        private readonly sportRepository: ISportRepository,
    ) {}

    async execute(id: string, data: UpdateSportRequest): Promise<Sport> {
        const sport = await this.sportRepository.findById(id);
        if (!sport) {
            throw new Error('Deporte no encontrado');
        }

        return this.sportRepository.update(id, sport.update(data));
    }
}
