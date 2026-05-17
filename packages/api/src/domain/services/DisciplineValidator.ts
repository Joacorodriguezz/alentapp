export class DisciplineValidator {
    validateDates(startDate: string, endDate: string): void {
        const start = new Date(startDate);
        const end = new Date(endDate);

        if (end <= start) {
            throw new Error('La fecha de fin debe ser estrictamente posterior a la fecha de inicio');
        }
    }

    validateReason(reason: string): void {
        if (!reason || reason.trim().length === 0) {
            throw new Error('El motivo es obligatorio');
        }
    }
}
