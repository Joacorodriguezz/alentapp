export interface CreateDisciplineRequest {
    reason: string;
    startDate: string;
    endDate: string;
    isTotalSuspension: boolean;
    memberId: string;
}

export interface DisciplineFilters {
    memberId?: string;
    onlyActive?: boolean;
}

export interface DisciplineResponse {
    id: string;
    reason: string;
    startDate: string;
    endDate: string;
    isTotalSuspension: boolean;
    memberId: string;
    deletedAt: string | null;
    createdAt: string;
    updatedAt: string;
}