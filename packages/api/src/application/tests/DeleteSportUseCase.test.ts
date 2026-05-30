import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DeleteSportUseCase } from '../useCases/DeleteSportUseCase.js';
import { ISportRepository } from '../ports/ISportRepository.js';
import { SportDomainService } from '../../domain/services/SportDomainService.js';
import { Sport } from '../../domain/entities/Sport.js';

describe('DeleteSportUseCase', () => {
    const mockSportRepository = {
        findById: vi.fn(),
        delete: vi.fn(),
    } as unknown as ISportRepository;

    const mockSportDomainService = {
        validateNoActiveEnrollments: vi.fn(),
    } as unknown as SportDomainService;

    const useCase = new DeleteSportUseCase(mockSportRepository, mockSportDomainService);

    const existingSport = new Sport(
        '550e8400-e29b-41d4-a716-446655440000',
        'Fútbol',
        'Deporte de equipo',
        20,
        null,
        false,
    );

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('debe eliminar un deporte exitosamente si existe', async () => {
        vi.mocked(mockSportRepository.findById).mockResolvedValueOnce(existingSport);
        vi.mocked(mockSportDomainService.validateNoActiveEnrollments).mockResolvedValueOnce(undefined);
        vi.mocked(mockSportRepository.delete).mockResolvedValueOnce(undefined);

        await useCase.execute('550e8400-e29b-41d4-a716-446655440000');

        expect(mockSportRepository.delete).toHaveBeenCalledWith(
            '550e8400-e29b-41d4-a716-446655440000',
        );
    });
});
