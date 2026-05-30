import { UpdateDisciplineRequest } from '@alentapp/shared';

export class DisciplineValidator {
    // Validación de formato HTTP/tipo - solo para parseo de entrada
    validateDateFormat(dateString: string): void {
        const isoRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;
        if (!isoRegex.test(dateString)) {
            throw new Error('Formato de fecha inválido (debe ser ISO 8601 DateTime)');
        }

        const date = new Date(dateString);
        if (isNaN(date.getTime())) {
            throw new Error('La fecha no es válida');
        }
    }

    // Validación HTTP: verificar que hay campos para actualizar
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

    // Validación de estado: sanción desactivada
    validateNotDeleted(deletedAt: string | null): void {
        if (deletedAt !== null) {
            throw new Error('No se puede editar una sanción desactivada');
        }
    }

    // Validación de estado: intentar eliminar ya eliminada
    validateCanDelete(deletedAt: string | null): void {
        if (deletedAt !== null) {
            throw new Error('La sanción ya fue eliminada');
        }
    }
}
