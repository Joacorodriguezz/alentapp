import { Locker } from '../../domain/entities/Locker.js';
import { ILockerRepository } from '../ports/ILockerRepository.js';

export class GetLockerByIdUseCase {
    constructor(private readonly lockerRepository: ILockerRepository) {}

    async execute(id: string): Promise<Locker> {
        const locker = await this.lockerRepository.findById(id);

        if (!locker) {
            throw new Error('El locker no existe');
        }

        return locker;
    }
}
