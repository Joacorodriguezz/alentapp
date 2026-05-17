import { DisciplineResponse, CreateDisciplineRequest } from '@alentapp/shared';

export interface IDisciplineRepository {
    create(data: CreateDisciplineRequest): Promise<DisciplineResponse>;
}
