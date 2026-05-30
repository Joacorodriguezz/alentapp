import { describe, it, expect } from 'vitest';
import { Discipline } from '../entities/Discipline.js';

describe('Discipline Entity', () => {
    const validData = {
        id: 'test-id-1',
        reason: 'Conducta antisportiva',
        startDate: '2026-05-01T10:00:00',
        endDate: '2026-05-15T10:00:00',
        isTotalSuspension: true,
        memberId: 'member-123',
    };

    describe('create factory', () => {
        it('debe crear una disciplina válida con todos los parámetros correctos', () => {
            const discipline = Discipline.create(
                validData.id,
                validData.reason,
                validData.startDate,
                validData.endDate,
                validData.isTotalSuspension,
                validData.memberId,
            );

            expect(discipline.id).toBe(validData.id);
            expect(discipline.reason).toBe(validData.reason);
            expect(discipline.startDate).toBe(validData.startDate);
            expect(discipline.endDate).toBe(validData.endDate);
            expect(discipline.isTotalSuspension).toBe(true);
            expect(discipline.memberId).toBe(validData.memberId);
            expect(discipline.deletedAt).toBeNull();
        });

        it('debe lanzar error si el reason está vacío', () => {
            expect(() =>
                Discipline.create(
                    validData.id,
                    '',
                    validData.startDate,
                    validData.endDate,
                    validData.isTotalSuspension,
                    validData.memberId,
                )
            ).toThrow('El motivo es obligatorio');
        });

        it('debe lanzar error si endDate es menor o igual a startDate', () => {
            expect(() =>
                Discipline.create(
                    validData.id,
                    validData.reason,
                    '2026-05-15T10:00:00',
                    '2026-05-15T10:00:00',
                    validData.isTotalSuspension,
                    validData.memberId,
                )
            ).toThrow('La fecha de fin debe ser posterior a la de inicio');
        });
    });
});
