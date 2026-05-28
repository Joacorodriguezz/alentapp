import { CreateLockerRequest } from '@alentapp/shared';
import { Locker } from '../../domain/entities/Locker.js';
import { LockerValidator } from '../../domain/services/LockerValidator.js';
import { ILockerRepository } from '../ports/ILockerRepository.js';

export class CreateLockerUseCase {
    constructor(
        private readonly lockerRepository: ILockerRepository,
        private readonly lockerValidator: LockerValidator,
    ) {}

    async execute(data: CreateLockerRequest): Promise<Locker> {
        const locker = new Locker({
            number: data?.number,
            location: data?.location,
        });

        await this.lockerValidator.validateNumberIsUnique(locker.number);

        return this.lockerRepository.create(locker);
    }
}
