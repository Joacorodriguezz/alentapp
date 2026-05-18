import { Locker } from '../../domain/entities/Locker.js';
import { ILockerRepository } from '../ports/ILockerRepository.js';

export class GetLockersUseCase {
    constructor(private readonly lockerRepository: ILockerRepository) {}

    async execute(): Promise<Locker[]> {
        return this.lockerRepository.findAll();
    }
}
