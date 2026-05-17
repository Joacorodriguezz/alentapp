import { IDisciplineRepository } from '../ports/IDisciplineRepository.js';
import { DisciplineResponse } from '@alentapp/shared';

export class GetDisciplineByIdUseCase {
    constructor(private readonly disciplineRepository: IDisciplineRepository) {}

    async execute(id: string): Promise<DisciplineResponse> {
        const discipline = await this.disciplineRepository.findById(id);

        if (!discipline) {
            throw new Error('La sanción no existe');
        }

        return discipline;
    }
}
