import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Locker } from '../../entities/Locker.js';
import { LockerValidator } from '../../services/LockerValidator.js';
import { CreateLockerUseCase } from '../../../application/useCases/CreateLockerUseCase.js';
import { UpdateLockerUseCase } from '../../../application/useCases/UpdateLockerUseCase.js';
import { DeleteLockerUseCase } from '../../../application/useCases/DeleteLockerUseCase.js';
import { ILockerRepository } from '../../../application/ports/ILockerRepository.js';
import { IMemberRepository } from '../../../application/ports/IMemberRepository.js';

describe('Locker use cases', () => {
    // Dobles del repositorio para aislar los casos de uso de la base de datos.
    const lockerRepo = {
        create: vi.fn(),
        findByNumber: vi.fn(),
        findAll: vi.fn(),
        findById: vi.fn(),
        delete: vi.fn(),
        update: vi.fn(),
    } as unknown as ILockerRepository;

    const memberRepo = {
        findById: vi.fn(),
    } as unknown as IMemberRepository;

    // El validator es lógica pura sobre el repositorio mockeado.
    const validator = new LockerValidator(lockerRepo);

    beforeEach(() => {
        vi.clearAllMocks();
    });

    // TDD-0004: unicidad del número (ruta de error).
    it('CreateLockerUseCase debe rechazar un número ya registrado', async () => {
        // Dado un número que ya existe en el repositorio.
        vi.mocked(lockerRepo.findByNumber).mockResolvedValueOnce(
            new Locker({ id: 'otro', number: 5, location: 'B' }),
        );
        const useCase = new CreateLockerUseCase(lockerRepo, validator);

        // Cuando se intenta crear otro locker con ese número.
        // Entonces falla y no se persiste nada.
        await expect(useCase.execute({ number: 5, location: 'A' })).rejects.toThrow(
            'Ya existe un locker con ese número',
        );
        expect(lockerRepo.create).not.toHaveBeenCalled();
    });

    // TDD-0005: asignar un socio existente transiciona automáticamente a Occupied.
    it('UpdateLockerUseCase debe pasar el locker a Occupied al asignar un socio válido', async () => {
        // Dado un locker disponible y un socio que existe.
        const locker = new Locker({ id: 'locker-1', number: 5, location: 'A' });
        vi.mocked(lockerRepo.findById).mockResolvedValueOnce(locker);
        vi.mocked(memberRepo.findById).mockResolvedValueOnce({ id: 'member-1' } as any);
        vi.mocked(lockerRepo.update).mockImplementation(async (_id, data) => data as Locker);
        const useCase = new UpdateLockerUseCase(lockerRepo, memberRepo, validator);

        // Cuando se actualiza asignando el socio.
        await useCase.execute('locker-1', { memberId: 'member-1' });

        // Entonces persiste el locker en estado Occupied con el socio.
        expect(lockerRepo.update).toHaveBeenCalledWith(
            'locker-1',
            expect.objectContaining({ status: 'Occupied', memberId: 'member-1' }),
        );
    });

    // TDD-0005: el socio asignado debe existir (ruta de error).
    it('UpdateLockerUseCase debe fallar si el socio asignado no existe', async () => {
        // Dado un locker existente pero un socio inexistente.
        const locker = new Locker({ id: 'locker-1', number: 5, location: 'A' });
        vi.mocked(lockerRepo.findById).mockResolvedValueOnce(locker);
        vi.mocked(memberRepo.findById).mockResolvedValueOnce(null);
        const useCase = new UpdateLockerUseCase(lockerRepo, memberRepo, validator);

        // Cuando se intenta asignar ese socio.
        // Entonces falla y no se persiste el cambio.
        await expect(
            useCase.execute('locker-1', { memberId: 'fantasma' }),
        ).rejects.toThrow('El socio solicitado no existe');
        expect(lockerRepo.update).not.toHaveBeenCalled();
    });

    // TDD-0006: no se puede eliminar un locker con socio asignado (ruta de error).
    it('DeleteLockerUseCase debe impedir borrar un locker asignado a un socio', async () => {
        // Dado un locker ocupado por un socio.
        const locker = new Locker({
            id: 'locker-1',
            number: 5,
            location: 'A',
            status: 'Occupied',
            memberId: 'member-1',
        });
        vi.mocked(lockerRepo.findById).mockResolvedValueOnce(locker);
        const useCase = new DeleteLockerUseCase(lockerRepo, validator);

        // Cuando se intenta eliminarlo.
        // Entonces falla y no se ejecuta el borrado.
        await expect(useCase.execute('locker-1')).rejects.toThrow(
            'No se puede eliminar un locker asignado a un socio',
        );
        expect(lockerRepo.delete).not.toHaveBeenCalled();
    });
});
