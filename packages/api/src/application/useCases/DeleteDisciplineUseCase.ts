import { IDisciplineRepository } from '../ports/IDisciplineRepository.js';
import { DisciplineValidator } from '../../domain/services/DisciplineValidator.js';
import { DisciplineResponse } from '@alentapp/shared';

export class DeleteDisciplineUseCase {
    constructor(
        private readonly disciplineRepository: IDisciplineRepository,
        private readonly disciplineValidator: DisciplineValidator,
    ) { }

    async execute(id: string): Promise<DisciplineResponse> {
        const existingDiscipline =
            await this.disciplineRepository.findById(id);
        if (!existingDiscipline) {
            throw new Error('La sanción no existe');
        }

        console.log('Discipline before delete:', existingDiscipline);
        this.disciplineValidator.validateCanDelete(existingDiscipline.deletedAt);

        await this.disciplineRepository.softDelete(id);

        const deletedDiscipline = await this.disciplineRepository.findById(id);
        return deletedDiscipline!;
        
    }
}