import { describe, expect, it, vi } from 'vitest';
import { Sport } from '../../domain/entities/Sport.js';
import { ISportRepository } from '../ports/ISportRepository.js';
import { GetSportByIdUseCase } from './GetSportByIdUseCase.js';

describe('GetSportByIdUseCase', () => {
    it('debe retornar el deporte encontrado por id', async () => {
        const sport = new Sport('1', 'Futbol', null, 20, null, false);
        const repository = {
            findById: vi.fn().mockResolvedValueOnce(sport),
        } as unknown as ISportRepository;
        const useCase = new GetSportByIdUseCase(repository);

        const result = await useCase.execute('1');

        expect(result).toEqual(sport);
        expect(repository.findById).toHaveBeenCalledWith('1');
    });

    it('debe fallar si el deporte no existe', async () => {
        const repository = {
            findById: vi.fn().mockResolvedValueOnce(null),
        } as unknown as ISportRepository;
        const useCase = new GetSportByIdUseCase(repository);

        await expect(useCase.execute('1')).rejects.toThrow('Deporte no encontrado');
    });
});
