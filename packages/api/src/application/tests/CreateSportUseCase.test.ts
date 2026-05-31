import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CreateSportUseCase } from '../useCases/CreateSportUseCase.js';
import { ISportRepository } from '../ports/ISportRepository.js';
import { SportValidator } from '../../domain/services/SportValidator.js';
import { Sport } from '../../domain/entities/Sport.js';

describe('CreateSportUseCase', () => {
    const mockSportRepository = {
        create: vi.fn(),
    } as unknown as ISportRepository;

    const mockSportValidator = {
        validateNameIsUnique: vi.fn(),
    } as unknown as SportValidator;

    const useCase = new CreateSportUseCase(mockSportRepository, mockSportValidator);

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('debe crear un deporte exitosamente si el nombre es único', async () => {
        const createdSport = new Sport(
            '550e8400-e29b-41d4-a716-446655440001',
            'Tenis',
            null,
            12,
            null,
            false,
        );

        vi.mocked(mockSportValidator.validateNameIsUnique).mockResolvedValueOnce(undefined);
        vi.mocked(mockSportRepository.create).mockResolvedValueOnce(createdSport);

        const result = await useCase.execute({ name: 'Tenis', maxCapacity: 12 });

        expect(mockSportValidator.validateNameIsUnique).toHaveBeenCalledWith('Tenis');
        expect(mockSportRepository.create).toHaveBeenCalled();
        expect(result).toEqual(createdSport);
    });
});
