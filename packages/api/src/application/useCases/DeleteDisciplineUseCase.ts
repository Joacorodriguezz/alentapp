import { IDisciplineRepository } from '../ports/IDisciplineRepository.js';
import { DisciplineValidator } from '../../domain/services/DisciplineValidator.js';

export class DeleteDisciplineUseCase {
    constructor(
        private readonly disciplineRepository: IDisciplineRepository,
        private readonly disciplineValidator: DisciplineValidator,
    ) { }

    async execute(id: string): Promise<void> {
        try {
            const existingDiscipline =
                await this.disciplineRepository.findById(id);
            if (!existingDiscipline) {
                throw new Error('La sanción no existe');
            }

            console.log('Discipline before delete:', existingDiscipline);
            this.disciplineValidator.validateCanDelete(existingDiscipline.deletedAt);

            await this.disciplineRepository.softDelete(id);
            console.log('Discipline deleted successfully');
        } catch (error) {
            console.error('Error in DeleteDisciplineUseCase:', error);
            throw error;
        }
    }
}