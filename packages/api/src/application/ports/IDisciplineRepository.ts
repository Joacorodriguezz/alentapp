import {
    DisciplineResponse,
    CreateDisciplineRequest,
    UpdateDisciplineRequest,
} from '@alentapp/shared';

export interface IDisciplineRepository {
    create(data: CreateDisciplineRequest): Promise<DisciplineResponse>;
    findById(id: string): Promise<DisciplineResponse | null>;
    update(
        id: string,
        data: Required<Pick<UpdateDisciplineRequest, 'reason' | 'startDate' | 'endDate' | 'isTotalSuspension'>>,
    ): Promise<DisciplineResponse>;
}
