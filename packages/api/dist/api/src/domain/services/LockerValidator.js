export class LockerValidator {
    lockerRepository;
    constructor(lockerRepository) {
        this.lockerRepository = lockerRepository;
    }
    async validateNumberIsUnique(number) {
        const existingLocker = await this.lockerRepository.findByNumber(number);
        if (existingLocker) {
            throw new Error('Ya existe un locker con ese número');
        }
    }
    async validateUpdatedNumberIsUnique(number, lockerId) {
        const existingLocker = await this.lockerRepository.findByNumber(number);
        if (existingLocker && existingLocker.id !== lockerId) {
            throw new Error('Ya existe un locker con ese número');
        }
    }
    validateExists(locker, message = 'El locker no existe') {
        if (!locker) {
            throw new Error(message);
        }
        return locker;
    }
}
