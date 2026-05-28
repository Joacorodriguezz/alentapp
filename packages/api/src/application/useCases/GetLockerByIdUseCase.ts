import { Locker } from '../../domain/entities/Locker.js';
import { LockerValidator } from '../../domain/services/LockerValidator.js';
import { ILockerRepository } from '../ports/ILockerRepository.js';

export class GetLockerByIdUseCase {
    constructor(
        private readonly lockerRepository: ILockerRepository,
        private readonly lockerValidator: LockerValidator,
    ) {}

    async execute(id: string): Promise<Locker> {
        this.lockerValidator.validateId(id);

        const locker = await this.lockerRepository.findById(id);

        if (!locker) {
            throw new Error('El locker no existe');
        }

        return locker;
    }
}
