import { ILockerRepository } from '../../application/ports/ILockerRepository.js';
import { Locker } from '../entities/Locker.js';

export class LockerValidator {
    constructor(private readonly lockerRepository: ILockerRepository) {}

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
