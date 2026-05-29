import { IDisciplineRepository } from '../ports/IDisciplineRepository.js';
import { DisciplineValidator } from '../../domain/services/DisciplineValidator.js';
import { DisciplineResponse, CreateDisciplineRequest } from '@alentapp/shared';
import { IMemberRepository } from '../ports/IMemberRepository.js';

export class CreateDisciplineUseCase {
    constructor(
        private readonly disciplineRepository: IDisciplineRepository,
        private readonly disciplineValidator: DisciplineValidator,
        private readonly memberRepository: IMemberRepository
    ) { }

    async execute(data: CreateDisciplineRequest): Promise<DisciplineResponse> {
        this.disciplineValidator.validateReason(data.reason);
        this.disciplineValidator.validateDateFormat(data.startDate);
        this.disciplineValidator.validateDateFormat(data.endDate);
        this.disciplineValidator.validateDates(data.startDate, data.endDate);

        const member = await this.memberRepository.findById(data.memberId);
        if (!member) {
            throw new Error('El socio indicado no existe');
        }

        return this.disciplineRepository.create(data);
    }
}
