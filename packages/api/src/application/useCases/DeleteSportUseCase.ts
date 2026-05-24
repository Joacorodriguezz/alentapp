import { ISportRepository } from '../ports/ISportRepository.js';
import { SportDomainService } from '../../domain/services/SportDomainService.js';

export class DeleteSportUseCase {
    constructor(
        private readonly sportRepo: ISportRepository,
        private readonly sportDomainService: SportDomainService,
    ) {}

    async execute(id: string): Promise<void> {
        const sport = await this.sportRepo.findById(id);
        if (!sport) {
            throw new Error('Deporte no encontrado');
        }

        await this.sportDomainService.validateNoActiveEnrollments(id);

        await this.sportRepo.delete(id);
    }
}