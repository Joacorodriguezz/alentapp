import type { UpdateSportRequest } from '@alentapp/shared';
import { ISportRepository } from '../ports/ISportRepository.js';
import { Sport } from '../../domain/entities/Sport.js';
import { SportValidator } from '../../domain/services/SportValidator.js';

export class UpdateSportUseCase {
    constructor(
        private readonly sportRepository: ISportRepository,
        private readonly sportValidator: SportValidator,
    ) {}

    async execute(id: string, data: UpdateSportRequest): Promise<Sport> {
        this.sportValidator.validateUpdateBody((data ?? {}) as Record<string, unknown>);

        if (data.maxCapacity !== undefined) {
            this.sportValidator.validateMaxCapacity(data.maxCapacity);
        }

        this.sportValidator.validateUpdateAdditionalPrice(data.additionalPrice);

        const sport = await this.sportRepository.findById(id);
        if (!sport) {
            throw new Error('Deporte no encontrado');
        }

        return this.sportRepository.update(id, sport.update(data));
    }
}
