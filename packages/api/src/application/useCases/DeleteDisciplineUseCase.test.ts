import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DeleteDisciplineUseCase } from './DeleteDisciplineUseCase.js';
import { IDisciplineRepository } from '../ports/IDisciplineRepository.js';
import { DisciplineValidator } from '../../domain/services/DisciplineValidator.js';

describe('DeleteDisciplineUseCase', () => {
    const mockDisciplineRepository = {
        findById: vi.fn(),
        softDelete: vi.fn(),
    } as unknown as IDisciplineRepository;

    const mockDisciplineValidator = new DisciplineValidator();

    const useCase = new DeleteDisciplineUseCase(
        mockDisciplineRepository,
        mockDisciplineValidator
    );

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('debe eliminar una disciplina exitosamente si existe', async () => {
        const existingDiscipline = {
            id: 'discipline-1',
            reason: 'Conducta antisportiva',
            startDate: '2026-05-01T10:00:00',
            endDate: '2026-05-15T10:00:00',
            isTotalSuspension: true,
            memberId: 'member-123',
            deletedAt: null,
            createdAt: '2026-05-01T10:00:00',
            updatedAt: '2026-05-01T10:00:00',
        };

        const deletedDiscipline = {
            ...existingDiscipline,
            deletedAt: new Date().toISOString(),
        };

        vi.mocked(mockDisciplineRepository.findById)
            .mockResolvedValueOnce(existingDiscipline as any)
            .mockResolvedValueOnce(deletedDiscipline as any);
        vi.mocked(mockDisciplineRepository.softDelete).mockResolvedValueOnce(undefined);

        const result = await useCase.execute('discipline-1');

        expect(result.deletedAt).not.toBeNull();
        expect(mockDisciplineRepository.softDelete).toHaveBeenCalledWith('discipline-1');
    });

    it('debe lanzar error si la sanción ya fue eliminada', async () => {
        const alreadyDeletedDiscipline = {
            id: 'discipline-1',
            reason: 'Conducta antisportiva',
            startDate: '2026-05-01T10:00:00',
            endDate: '2026-05-15T10:00:00',
            isTotalSuspension: true,
            memberId: 'member-123',
            deletedAt: '2026-05-20T10:00:00',
            createdAt: '2026-05-01T10:00:00',
            updatedAt: '2026-05-20T10:00:00',
        };

        vi.mocked(mockDisciplineRepository.findById).mockResolvedValueOnce(alreadyDeletedDiscipline as any);

        await expect(useCase.execute('discipline-1')).rejects.toThrow(
            'La sanción ya fue eliminada'
        );

        expect(mockDisciplineRepository.softDelete).not.toHaveBeenCalled();
    });
});
