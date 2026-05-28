import { ILockerRepository } from '../../application/ports/ILockerRepository.js';
import { Locker } from '../entities/Locker.js';

export class LockerValidator {
    constructor(private readonly lockerRepository: ILockerRepository) {}

    validateId(id: string): void {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(id)) {
            throw new Error('El id del locker es inválido');
        }
    }

    async validateNumberIsUnique(number: number): Promise<void> {
        const existingLocker = await this.lockerRepository.findByNumber(number);
        if (existingLocker) {
            throw new Error('Ya existe un locker con ese número');
        }
    }

    async validateUpdatedNumberIsUnique(number: number, lockerId: string): Promise<void> {
        const existingLocker = await this.lockerRepository.findByNumber(number);
        if (existingLocker && existingLocker.id !== lockerId) {
            throw new Error('Ya existe un locker con ese número');
        }
    }

    validateExists(locker: Locker | null, message = 'El locker no existe'): Locker {
        if (!locker) {
            throw new Error(message);
        }

        return locker;
    }
}
