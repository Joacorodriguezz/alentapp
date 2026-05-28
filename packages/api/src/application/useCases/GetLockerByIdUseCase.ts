import { Locker } from '../../domain/entities/Locker.js';
import { ILockerRepository } from '../ports/ILockerRepository.js';
import { isValidLockerId } from './lockerId.js';

export class GetLockerByIdUseCase {
    constructor(private readonly lockerRepository: ILockerRepository) {}

    async execute(id: string): Promise<Locker> {
        if (!isValidLockerId(id)) {
            throw new Error('El id del locker es inválido');
        }

        const locker = await this.lockerRepository.findById(id);

        if (!locker) {
            throw new Error('El locker no existe');
        }

        return locker;
    }
}
