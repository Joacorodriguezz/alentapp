export class DeleteLockerUseCase {
    lockerRepository;
    lockerValidator;
    constructor(lockerRepository, lockerValidator) {
        this.lockerRepository = lockerRepository;
        this.lockerValidator = lockerValidator;
    }
    async execute(id) {
        const locker = this.lockerValidator.validateExists(await this.lockerRepository.findById(id));
        locker.ensureCanBeDeleted();
        await this.lockerRepository.delete(id);
        return { id };
    }
}
