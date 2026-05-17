import { DisciplineResponse, CreateDisciplineRequest, DisciplineFilters } from '@alentapp/shared';

export interface IDisciplineRepository {
    create(data: CreateDisciplineRequest): Promise<DisciplineResponse>;
    findAll(filters?: DisciplineFilters): Promise<DisciplineResponse[]>;
    findById(id: string): Promise<DisciplineResponse | null>;
}
