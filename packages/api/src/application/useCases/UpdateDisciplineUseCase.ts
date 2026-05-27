import { IDisciplineRepository } from '../ports/IDisciplineRepository.js';
import { DisciplineValidator } from '../../domain/services/DisciplineValidator.js';
import { DisciplineResponse, UpdateDisciplineRequest } from '@alentapp/shared';

export class UpdateDisciplineUseCase {
    constructor(
        private readonly disciplineRepository: IDisciplineRepository,
        private readonly disciplineValidator: DisciplineValidator,
    ) { }

    async execute(id: string, data: UpdateDisciplineRequest): Promise<DisciplineResponse> {
        const existing = await this.disciplineRepository.findById(id);

        if (!existing) {
            throw new Error('La sanción no existe');
        }

        this.disciplineValidator.validateNotDeleted(existing.deletedAt);
        this.disciplineValidator.validateHasFieldsToUpdate(data);

        if (data.startDate) {
            this.disciplineValidator.validateDateFormat(data.startDate);
        }
        if (data.endDate) {
            this.disciplineValidator.validateDateFormat(data.endDate);
        }
        const finalReason = data.reason ?? existing.reason;
        const finalStartDate = data.startDate ?? existing.startDate;
        const finalEndDate = data.endDate ?? existing.endDate;
        const finalIsTotalSuspension = data.isTotalSuspension ?? existing.isTotalSuspension;

        if (data.reason !== undefined) {
            this.disciplineValidator.validateReason(data.reason);
        }

        this.disciplineValidator.validateDates(finalStartDate, finalEndDate);

        return this.disciplineRepository.update(id, {
            reason: finalReason,
            startDate: finalStartDate,
            endDate: finalEndDate,
            isTotalSuspension: finalIsTotalSuspension,
        });
    }
}
