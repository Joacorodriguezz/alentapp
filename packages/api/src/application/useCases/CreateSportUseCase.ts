import { CreateSportRequest } from '@alentapp/shared';
import { Sport } from '../../domain/entities/Sport.js';
import { SportRepository } from '../../domain/services/sportRepository.js';
import { SportValidator } from '../../domain/services/SportValidator.js';


export class CreateSportUseCase {
    constructor(
        private readonly sportRepository: SportRepository,
        private readonly sportValidator: SportValidator,
    ) {}

    async execute(data: CreateSportRequest): Promise<Sport> {
        this.sportValidator.validateName(data?.name);
        this.sportValidator.validateMaxCapacity(data?.maxCapacity);
        this.sportValidator.validateAdditionalPrice(data?.additionalPrice);
        await this.sportValidator.validateNameIsUnique(data.name);

        const sport = new Sport({
            name: data.name.trim(),
            description: data.description ?? null,
            maxCapacity: data.maxCapacity,
            additionalPrice: data.additionalPrice ?? null,
            requiresMedicalCertificate: data.requiresMedicalCertificate ?? false,
        });

        return this.sportRepository.create(sport);
    }
}
