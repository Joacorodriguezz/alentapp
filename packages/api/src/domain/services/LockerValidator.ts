import type { CreateLockerRequest } from '@alentapp/shared';
import { ILockerRepository } from '../../application/ports/ILockerRepository.js';
import { Locker } from '../entities/Locker.js';

export class LockerValidator {
    constructor(private readonly lockerRepository: ILockerRepository) {}

    async validateAndCreate(data: CreateLockerRequest): Promise<Locker> {
        this.validateNumber(data.number);
        this.validateLocation(data.location);
        await this.validateNumberIsUnique(data.number);

        return new Locker({
            number: data.number,
            location: data.location.trim(),
            status: 'Available',
            memberId: null,
        });
    }

    validateNumber(number: unknown): void {
        if (number === undefined || number === null) {
            throw new Error('El numero es obligatorio');
        }

        if (typeof number !== 'number' || !Number.isInteger(number) || number <= 0) {
            throw new Error('El numero debe ser un entero positivo');
        }
    }

    validateLocation(location: unknown): void {
        if (typeof location !== 'string' || location.trim().length === 0) {
            throw new Error('La ubicación es obligatoria');
        }
    }

    async validateNumberIsUnique(number: number): Promise<void> {
        const existingLocker = await this.lockerRepository.findByNumber(number);
        if (existingLocker) {
            throw new Error('Ya existe un locker con ese número');
        }
    }

    validateExists(locker: Locker | null): Locker {
        if (!locker) {
            throw new Error('El locker no existe');
        }

        return locker;
    }

    validateCanDelete(locker: Locker): void {
        if (locker.memberId !== null) {
            throw new Error('No se puede eliminar un locker asignado a un socio');
        }
    }
}
