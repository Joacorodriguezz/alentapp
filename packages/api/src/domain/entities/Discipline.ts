export class Discipline {
    private constructor(
        public readonly id: string,
        public reason: string,
        public startDate: string,
        public endDate: string,
        public isTotalSuspension: boolean,
        public readonly memberId: string,
        public deletedAt: string | null,
        public readonly createdAt: string,
        public updatedAt: string,
    ) {}

    static create(
        id: string,
        reason: string,
        startDate: string,
        endDate: string,
        isTotalSuspension: boolean,
        memberId: string,
        deletedAt: string | null = null,
        createdAt: string = new Date().toISOString(),
        updatedAt: string = new Date().toISOString(),
    ): Discipline {
        // Validar invariantes propios de la entidad
        if (!reason || reason.trim().length === 0) {
            throw new Error('El motivo es obligatorio');
        }

        const start = new Date(startDate);
        const end = new Date(endDate);
        if (end <= start) {
            throw new Error('La fecha de fin debe ser posterior a la de inicio');
        }

        return new Discipline(
            id,
            reason,
            startDate,
            endDate,
            isTotalSuspension,
            memberId,
            deletedAt,
            createdAt,
            updatedAt,
        );
    }

    static fromPersistence(
        id: string,
        reason: string,
        startDate: string,
        endDate: string,
        isTotalSuspension: boolean,
        memberId: string,
        deletedAt: string | null,
        createdAt: string,
        updatedAt: string,
    ): Discipline {
        // Reconstruir desde persistencia sin validar (ya fue validado)
        return new Discipline(
            id,
            reason,
            startDate,
            endDate,
            isTotalSuspension,
            memberId,
            deletedAt,
            createdAt,
            updatedAt,
        );
    }
}