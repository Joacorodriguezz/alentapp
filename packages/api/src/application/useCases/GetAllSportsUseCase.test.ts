import { describe, expect, it, vi } from 'vitest';
import { Sport } from '../../domain/entities/Sport.js';
import { ISportRepository } from '../ports/ISportRepository.js';
import { GetAllSportsUseCase } from './GetAllSportsUseCase.js';

describe('GetAllSportsUseCase', () => {
    it('debe retornar todos los deportes', async () => {
        const sports = [
            new Sport('1', 'Futbol', null, 20, null, false),
            new Sport('2', 'Natacion', 'Pileta libre', 15, 1000, true),
        ];
        const repository = {
            findAll: vi.fn().mockResolvedValueOnce(sports),
        } as unknown as ISportRepository;
        const useCase = new GetAllSportsUseCase(repository);

        const result = await useCase.execute();

        expect(result).toEqual(sports);
        expect(repository.findAll).toHaveBeenCalledWith(undefined);
    });

    it('debe delegar el filtro de certificado medico al repositorio', async () => {
        const repository = {
            findAll: vi.fn().mockResolvedValueOnce([]),
        } as unknown as ISportRepository;
        const useCase = new GetAllSportsUseCase(repository);

        await useCase.execute({ requiresMedicalCertificate: true });

        expect(repository.findAll).toHaveBeenCalledWith({
            requiresMedicalCertificate: true,
        });
    });
});
