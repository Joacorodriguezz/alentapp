import { IDisciplineRepository } from '../ports/IDisciplineRepository.js';
import { DisciplineValidator } from '../../domain/services/DisciplineValidator.js';
import { DisciplineResponse, CreateDisciplineRequest } from '@alentapp/shared';

export class CreateDisciplineUseCase {
    constructor(
        private readonly disciplineRepository: IDisciplineRepository,
        private readonly disciplineValidator: DisciplineValidator,
    ) { }

    async execute(data: CreateDisciplineRequest): Promise<DisciplineResponse> {
        this.disciplineValidator.validateReason(data.reason);
        this.disciplineValidator.validateDates(data.startDate, data.endDate);

        return this.disciplineRepository.create(data);
    }
}
