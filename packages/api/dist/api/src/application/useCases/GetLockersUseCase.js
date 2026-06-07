export class GetLockersUseCase {
    lockerRepository;
    constructor(lockerRepository) {
        this.lockerRepository = lockerRepository;
    }
    async execute() {
        return this.lockerRepository.findAll();
    }
}
