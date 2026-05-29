import { describe, it, expect } from 'vitest';
import { DisciplineValidator } from './DisciplineValidator.js';

describe('DisciplineValidator', () => {
    const validator = new DisciplineValidator();

    describe('validateDateFormat', () => {
        it('debe pasar si la fecha tiene formato ISO 8601 válido', () => {
            expect(() =>
                validator.validateDateFormat('2026-05-15T10:30:00')
            ).not.toThrow();

            expect(() =>
                validator.validateDateFormat('2026-01-01T00:00:00')
            ).not.toThrow();
        });

        it('debe lanzar error si el formato de fecha es inválido', () => {
            expect(() =>
                validator.validateDateFormat('2026-05-15 10:30:00')
            ).toThrow('Formato de fecha inválido');
        });

        it('debe lanzar error si la fecha es inválida', () => {
            expect(() =>
                validator.validateDateFormat('2026-13-45T25:70:00')
            ).toThrow('La fecha no es válida');
        });
    });

    describe('validateHasFieldsToUpdate', () => {
        it('debe pasar si hay al menos un campo a actualizar', () => {
            expect(() =>
                validator.validateHasFieldsToUpdate({ reason: 'Nueva razón' })
            ).not.toThrow();
        });

        it('debe lanzar error si no hay campos a actualizar', () => {
            expect(() =>
                validator.validateHasFieldsToUpdate({})
            ).toThrow('Debe enviar al menos un campo a actualizar');
        });

        it('debe pasar si hay múltiples campos a actualizar', () => {
            expect(() =>
                validator.validateHasFieldsToUpdate({
                    startDate: '2026-05-20T10:00:00',
                    isTotalSuspension: false,
                })
            ).not.toThrow();
        });
    });

    describe('validateNotDeleted', () => {
        it('debe pasar si deletedAt es null', () => {
            expect(() =>
                validator.validateNotDeleted(null)
            ).not.toThrow();
        });

        it('debe lanzar error si la sanción está desactivada', () => {
            expect(() =>
                validator.validateNotDeleted('2026-05-15T10:00:00')
            ).toThrow('No se puede editar una sanción desactivada');
        });
    });

    describe('validateCanDelete', () => {
        it('debe pasar si deletedAt es null', () => {
            expect(() =>
                validator.validateCanDelete(null)
            ).not.toThrow();
        });

        it('debe lanzar error si la sanción ya fue eliminada', () => {
            expect(() =>
                validator.validateCanDelete('2026-05-15T10:00:00')
            ).toThrow('La sanción ya fue eliminada');
        });
    });
});