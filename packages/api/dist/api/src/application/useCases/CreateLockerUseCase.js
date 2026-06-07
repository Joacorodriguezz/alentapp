import { Locker } from '../../domain/entities/Locker.js';
export class CreateLockerUseCase {
    lockerRepository;
    lockerValidator;
    constructor(lockerRepository, lockerValidator) {
        this.lockerRepository = lockerRepository;
        this.lockerValidator = lockerValidator;
    }
    async execute(data) {
        const locker = new Locker({
            number: data?.number,
            location: data?.location,
        });
        await this.lockerValidator.validateNumberIsUnique(locker.number);
        return this.lockerRepository.create(locker);
    }
}
