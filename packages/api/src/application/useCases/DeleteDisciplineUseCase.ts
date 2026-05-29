import { IDisciplineRepository } from '../ports/IDisciplineRepository.js';
import { DisciplineValidator } from '../../domain/services/DisciplineValidator.js';
import { DisciplineResponse } from '@alentapp/shared';

export class DeleteDisciplineUseCase {
    constructor(
        private readonly disciplineRepository: IDisciplineRepository,
        private readonly disciplineValidator: DisciplineValidator,
    ) { }

    async execute(id: string): Promise<DisciplineResponse> {
        // Validar que la sanción existe
        const existingDiscipline = await this.disciplineRepository.findById(id);
        if (!existingDiscipline) {
            throw new Error('La sanción no existe');
        }

        // Validar que no esté ya eliminada (regla: no se puede eliminar lo ya eliminado)
        this.disciplineValidator.validateCanDelete(existingDiscipline.deletedAt);

        // Realizar eliminación lógica
        await this.disciplineRepository.softDelete(id);

        // Retornar la sanción actualizada con el timestamp de eliminación
        const deletedDiscipline = await this.disciplineRepository.findById(id);
        return deletedDiscipline!;
    }
}