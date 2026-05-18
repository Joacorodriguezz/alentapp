import { IDisciplineRepository } from '../ports/IDisciplineRepository.js';
import { DisciplineValidator } from '../../domain/services/DisciplineValidator.js';

export class DeleteDisciplineUseCase {
    constructor(
        private readonly disciplineRepository: IDisciplineRepository,
        private readonly disciplineValidator: DisciplineValidator,
    ) { }

    async execute(id: string): Promise<void> {
        const existingDiscipline =
            await this.disciplineRepository.findById(id);
        if (!existingDiscipline) {
            throw new Error('La sanción no existe');
        }

        this.disciplineValidator.validateCanDelete(existingDiscipline.deletedAt);

        if (existingDiscipline.deletedAt !== null) {
            throw new Error('La sanción ya fue eliminada');
        }

        await this.disciplineRepository.softDelete(id);
    }
}