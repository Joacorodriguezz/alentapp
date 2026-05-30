import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UpdateDisciplineUseCase } from '../useCases/UpdateDisciplineUseCase.js';
import { IDisciplineRepository } from '../ports/IDisciplineRepository.js';
import { DisciplineValidator } from '../../domain/services/DisciplineValidator.js';

describe('UpdateDisciplineUseCase', () => {
    const mockDisciplineRepository = {
        findById: vi.fn(),
        update: vi.fn(),
    } as unknown as IDisciplineRepository;

    const mockDisciplineValidator = new DisciplineValidator();

    const useCase = new UpdateDisciplineUseCase(
        mockDisciplineRepository,
        mockDisciplineValidator
    );

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('debe actualizar una disciplina exitosamente si existe y no está desactivada', async () => {
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

        const updateData = {
            reason: 'Nueva razón',
        };

        const updatedDiscipline = {
            ...existingDiscipline,
            reason: 'Nueva razón',
            updatedAt: new Date().toISOString(),
        };

        vi.mocked(mockDisciplineRepository.findById).mockResolvedValueOnce(existingDiscipline as any);
        vi.mocked(mockDisciplineRepository.update).mockResolvedValueOnce(updatedDiscipline as any);

        const result = await useCase.execute('discipline-1', updateData);

        expect(result).toEqual(updatedDiscipline);
        expect(mockDisciplineRepository.update).toHaveBeenCalled();
    });

    it('debe lanzar error si la sanción ya fue eliminada', async () => {
        const deletedDiscipline = {
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

        vi.mocked(mockDisciplineRepository.findById).mockResolvedValueOnce(deletedDiscipline as any);

        await expect(
            useCase.execute('discipline-1', { reason: 'Nueva razón' })
        ).rejects.toThrow('No se puede editar una sanción desactivada');

        expect(mockDisciplineRepository.update).not.toHaveBeenCalled();
    });
});
