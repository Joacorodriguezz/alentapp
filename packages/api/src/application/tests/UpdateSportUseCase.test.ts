import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UpdateSportUseCase } from '../useCases/UpdateSportUseCase.js';
import { ISportRepository } from '../ports/ISportRepository.js';
import { Sport } from '../../domain/entities/Sport.js';

describe('UpdateSportUseCase', () => {
    const mockSportRepository = {
        findById: vi.fn(),
        update: vi.fn(),
    } as unknown as ISportRepository;

    const useCase = new UpdateSportUseCase(mockSportRepository);

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

    it('debe actualizar un deporte exitosamente si existe', async () => {
        const updateData = { description: 'Fútbol 11', maxCapacity: 22 };
        const updatedSport = existingSport.update(updateData);

        vi.mocked(mockSportRepository.findById).mockResolvedValueOnce(existingSport);
        vi.mocked(mockSportRepository.update).mockResolvedValueOnce(updatedSport);

        const result = await useCase.execute('550e8400-e29b-41d4-a716-446655440000', updateData);

        expect(result.maxCapacity).toBe(22);
        expect(mockSportRepository.update).toHaveBeenCalledWith(
            '550e8400-e29b-41d4-a716-446655440000',
            expect.any(Sport),
        );
    });

    it('debe lanzar error si el deporte no existe', async () => {
        vi.mocked(mockSportRepository.findById).mockResolvedValueOnce(null);

        await expect(
            useCase.execute('550e8400-e29b-41d4-a716-446655440099', { maxCapacity: 15 }),
        ).rejects.toThrow('Deporte no encontrado');

        expect(mockSportRepository.update).not.toHaveBeenCalled();
    });
});
