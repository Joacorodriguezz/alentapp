import { DisciplineResponse } from '@alentapp/shared';

export class DisciplinePersistenceMapper {
  static toPersistence(discipline: DisciplineResponse): any {
    return {
      id: discipline.id,
      reason: discipline.reason,
      startDate: new Date(discipline.startDate),
      endDate: new Date(discipline.endDate),
      isTotalSuspension: discipline.isTotalSuspension,
      memberId: discipline.memberId,
      deletedAt: discipline.deletedAt ? new Date(discipline.deletedAt) : null,
      createdAt: new Date(discipline.createdAt),
      updatedAt: new Date(discipline.updatedAt),
    };
  }

  static toDomain(raw: any): DisciplineResponse {
    return {
      id: raw.id,
      reason: raw.reason,
      startDate: raw.startDate.toISOString(),
      endDate: raw.endDate.toISOString(),
      isTotalSuspension: raw.isTotalSuspension,
      memberId: raw.memberId,
      deletedAt: raw.deletedAt ? raw.deletedAt.toISOString() : null,
      createdAt: raw.createdAt.toISOString(),
      updatedAt: raw.updatedAt.toISOString(),
    };
  }
}
