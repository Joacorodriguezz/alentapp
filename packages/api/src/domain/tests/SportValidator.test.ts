import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SportValidator } from '../services/SportValidator.js';
import { ISportRepository } from '../../application/ports/ISportRepository.js';
import { Sport } from '../entities/Sport.js';

describe('SportValidator', () => {
    const mockSportRepository = {
        findByName: vi.fn(),
    } as unknown as ISportRepository;

    const validator = new SportValidator(mockSportRepository);

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('validateNameIsUnique', () => {
        it('debe pasar si no existe un deporte con el mismo nombre', async () => {
            vi.mocked(mockSportRepository.findByName).mockResolvedValueOnce(null);

            await expect(validator.validateNameIsUnique('Tenis')).resolves.toBeUndefined();
            expect(mockSportRepository.findByName).toHaveBeenCalledWith('Tenis');
        });

        it('debe lanzar error si ya existe un deporte con el mismo nombre', async () => {
            const existingSport = new Sport(
                '550e8400-e29b-41d4-a716-446655440000',
                'Tenis',
                null,
                10,
                null,
                false,
            );

            vi.mocked(mockSportRepository.findByName).mockResolvedValueOnce(existingSport);

            await expect(validator.validateNameIsUnique('Tenis')).rejects.toThrow(
                'El deporte ya existe',
            );
        });
    });
});
