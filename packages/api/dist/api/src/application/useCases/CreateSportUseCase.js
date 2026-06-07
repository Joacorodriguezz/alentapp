import { Sport } from '../../domain/entities/Sport.js';
export class CreateSportUseCase {
    sportRepository;
    sportValidator;
    constructor(sportRepository, sportValidator) {
        this.sportRepository = sportRepository;
        this.sportValidator = sportValidator;
    }
    async execute(data) {
        await this.sportValidator.validateNameIsUnique(data.name);
        const sport = new Sport(undefined, data.name.trim(), data.description ?? null, data.maxCapacity, data.additionalPrice ?? null, data.requiresMedicalCertificate ?? false);
        return this.sportRepository.create(sport);
    }
}
