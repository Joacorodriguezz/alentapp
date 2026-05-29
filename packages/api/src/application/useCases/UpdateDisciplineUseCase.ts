import { IDisciplineRepository } from '../ports/IDisciplineRepository.js';
import { DisciplineValidator } from '../../domain/services/DisciplineValidator.js';
import { Discipline } from '../../domain/entities/Discipline.js';
import { DisciplineResponse, UpdateDisciplineRequest } from '@alentapp/shared';

export class UpdateDisciplineUseCase {
    constructor(
        private readonly disciplineRepository: IDisciplineRepository,
        private readonly disciplineValidator: DisciplineValidator,
    ) { }

    async execute(id: string, data: UpdateDisciplineRequest): Promise<DisciplineResponse> {
        // Validar que la sanción existe
        const existing = await this.disciplineRepository.findById(id);
        if (!existing) {
            throw new Error('La sanción no existe');
        }

        // Validar que no esté desactivada (eliminación lógica)
        this.disciplineValidator.validateNotDeleted(existing.deletedAt);

        // Validar que hay campos para actualizar
        this.disciplineValidator.validateHasFieldsToUpdate(data);

        // Validar formato de fechas si se envían
        if (data.startDate) {
            this.disciplineValidator.validateDateFormat(data.startDate);
        }
        if (data.endDate) {
            this.disciplineValidator.validateDateFormat(data.endDate);
        }

        // Calcular estado final después de la actualización
        const finalReason = data.reason ?? existing.reason;
        const finalStartDate = data.startDate ?? existing.startDate;
        const finalEndDate = data.endDate ?? existing.endDate;
        const finalIsTotalSuspension = data.isTotalSuspension ?? existing.isTotalSuspension;

        // Crear nueva instancia con valores finales - validará invariantes propios
        const updatedDiscipline = Discipline.create(
            id,
            finalReason,
            finalStartDate,
            finalEndDate,
            finalIsTotalSuspension,
            existing.memberId,
            existing.deletedAt,
            existing.createdAt,
            new Date().toISOString(),
        );

        return this.disciplineRepository.update(id, {
            reason: updatedDiscipline.reason,
            startDate: updatedDiscipline.startDate,
            endDate: updatedDiscipline.endDate,
            isTotalSuspension: updatedDiscipline.isTotalSuspension,
        });
    }
}
