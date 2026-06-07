export class Discipline {
    id;
    reason;
    startDate;
    endDate;
    isTotalSuspension;
    memberId;
    deletedAt;
    createdAt;
    updatedAt;
    constructor(id, reason, startDate, endDate, isTotalSuspension, memberId, deletedAt, createdAt, updatedAt) {
        this.id = id;
        this.reason = reason;
        this.startDate = startDate;
        this.endDate = endDate;
        this.isTotalSuspension = isTotalSuspension;
        this.memberId = memberId;
        this.deletedAt = deletedAt;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }
    static create(id, reason, startDate, endDate, isTotalSuspension, memberId, deletedAt = null, createdAt = new Date().toISOString(), updatedAt = new Date().toISOString()) {
        // Validar invariantes propios de la entidad
        if (!reason || reason.trim().length === 0) {
            throw new Error('El motivo es obligatorio');
        }
        const start = new Date(startDate);
        const end = new Date(endDate);
        if (end <= start) {
            throw new Error('La fecha de fin debe ser posterior a la de inicio');
        }
        return new Discipline(id, reason, startDate, endDate, isTotalSuspension, memberId, deletedAt, createdAt, updatedAt);
    }
    static fromPersistence(id, reason, startDate, endDate, isTotalSuspension, memberId, deletedAt, createdAt, updatedAt) {
        // Reconstruir desde persistencia sin validar (ya fue validado)
        return new Discipline(id, reason, startDate, endDate, isTotalSuspension, memberId, deletedAt, createdAt, updatedAt);
    }
}
