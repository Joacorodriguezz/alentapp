import { IDisciplineRepository } from '../ports/IDisciplineRepository.js';
import { DisciplineResponse, DisciplineFilters } from '@alentapp/shared';

export class GetDisciplinesUseCase {
    constructor(private readonly disciplineRepository: IDisciplineRepository) {}

    async execute(filters?: DisciplineFilters): Promise<DisciplineResponse[]> {
        return this.disciplineRepository.findAll(filters);
    }
}
