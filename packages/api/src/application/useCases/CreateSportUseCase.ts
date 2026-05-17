import { CreateSportRequest } from '@alentapp/shared';
import { ISportRepository } from '../ports/ISportRepository.js';
import { Sport } from '../../domain/entities/Sport.js';
import { SportValidator } from '../../domain/services/SportValidator.js';

export class CreateSportUseCase {
    constructor(
        private readonly sportRepository: ISportRepository,
        private readonly sportValidator: SportValidator,
    ) {}

    async execute(data: CreateSportRequest): Promise<Sport> {
        this.sportValidator.validateName(data?.name);
        this.sportValidator.validateMaxCapacity(data?.maxCapacity);
        this.sportValidator.validateAdditionalPrice(data?.additionalPrice);
        await this.sportValidator.validateNameIsUnique(data.name);

        const sport = new Sport(
            undefined,
            data.name.trim(),
            data.description ?? null,
            data.maxCapacity,
            data.additionalPrice ?? null,
            data.requiresMedicalCertificate ?? false,
        );

        return this.sportRepository.create(sport);
    }
}
