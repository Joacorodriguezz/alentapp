import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CreateDisciplineUseCase } from './CreateDisciplineUseCase.js';
import { IDisciplineRepository } from '../ports/IDisciplineRepository.js';
import { DisciplineValidator } from '../../domain/services/DisciplineValidator.js';
import { IMemberRepository } from '../ports/IMemberRepository.js';

describe('CreateDisciplineUseCase', () => {
    const mockDisciplineRepository = {
        create: vi.fn(),
    } as unknown as IDisciplineRepository;

    const mockDisciplineValidator = new DisciplineValidator();

    const mockMemberRepository = {
        findById: vi.fn(),
    } as unknown as IMemberRepository;

    const useCase = new CreateDisciplineUseCase(
        mockDisciplineRepository,
        mockDisciplineValidator,
        mockMemberRepository
    );

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('debe crear una disciplina exitosamente si los datos son válidos y el socio existe', async () => {
        const createData = {
            reason: 'Conducta antisportiva',
            startDate: '2026-05-01T10:00:00',
            endDate: '2026-05-15T10:00:00',
            isTotalSuspension: true,
            memberId: 'member-123',
        };

        const mockMember = { id: 'member-123', name: 'Juan Pérez' };
        const mockDiscipline = {
            id: 'discipline-1',
            ...createData,
            deletedAt: null,
            createdAt: '2026-05-01T10:00:00',
            updatedAt: '2026-05-01T10:00:00',
        };

        vi.mocked(mockMemberRepository.findById).mockResolvedValueOnce(mockMember as any);
        vi.mocked(mockDisciplineRepository.create).mockResolvedValueOnce(mockDiscipline as any);

        const result = await useCase.execute(createData);

        expect(result).toEqual(mockDiscipline);
        expect(mockMemberRepository.findById).toHaveBeenCalledWith('member-123');
        expect(mockDisciplineRepository.create).toHaveBeenCalled();
    });

    it('debe lanzar error si el socio no existe', async () => {
        const createData = {
            reason: 'Conducta antisportiva',
            startDate: '2026-05-01T10:00:00',
            endDate: '2026-05-15T10:00:00',
            isTotalSuspension: true,
            memberId: 'member-999',
        };

        vi.mocked(mockMemberRepository.findById).mockResolvedValueOnce(null);

        await expect(useCase.execute(createData)).rejects.toThrow(
            'El socio indicado no existe'
        );

        expect(mockDisciplineRepository.create).not.toHaveBeenCalled();
    });
});
