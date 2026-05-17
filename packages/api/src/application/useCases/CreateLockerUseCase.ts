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
        this.lockerValidator.validateNumber(data?.number);
        this.lockerValidator.validateLocation(data?.location);
        await this.lockerValidator.validateNumberIsUnique(data.number);

        const locker = new Locker({
            number: data.number,
            location: data.location.trim(),
            status: 'Available',
            memberId: null,
        });

        return this.lockerRepository.create(locker);
    }
}
