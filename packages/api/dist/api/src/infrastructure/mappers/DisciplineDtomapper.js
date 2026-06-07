export class DisciplineDTOMapper {
    static toDTO(discipline) {
        return {
            id: discipline.id,
            reason: discipline.reason,
            startDate: discipline.startDate,
            endDate: discipline.endDate,
            isTotalSuspension: discipline.isTotalSuspension,
            memberId: discipline.memberId,
            deletedAt: discipline.deletedAt,
            createdAt: discipline.createdAt,
            updatedAt: discipline.updatedAt,
        };
    }
    static toDomainArray(disciplines) {
        return disciplines.map(d => this.toDTO(d));
    }
}
