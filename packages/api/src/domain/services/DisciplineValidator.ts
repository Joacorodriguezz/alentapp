import { UpdateDisciplineRequest } from '@alentapp/shared';

export class DisciplineValidator {
    validateDates(startDate: string, endDate: string): void {
        const start = new Date(startDate);
        const end = new Date(endDate);

        if (end <= start) {
            throw new Error('La fecha de fin debe ser posterior a la de inicio');
        }
    }

    validateReason(reason: string): void {
        if (!reason || reason.trim().length === 0) {
            throw new Error('El motivo es obligatorio');
        }
    }

    validateHasFieldsToUpdate(data: UpdateDisciplineRequest): void {
        const hasField =
            data.reason !== undefined ||
            data.startDate !== undefined ||
            data.endDate !== undefined ||
            data.isTotalSuspension !== undefined;

        if (!hasField) {
            throw new Error('Debe enviar al menos un campo a actualizar');
        }
    }

    validateNotDeleted(deletedAt: string | null): void {
        if (deletedAt !== null) {
            throw new Error('No se puede editar una sanción desactivada');
        }
    }

    validateCanDelete(deletedAt: string | null): void {
        if (deletedAt !== null) {
            throw new Error('La sanción ya fue eliminada');
        }
    }
}
