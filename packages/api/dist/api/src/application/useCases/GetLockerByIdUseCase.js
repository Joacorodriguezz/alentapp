export class GetLockerByIdUseCase {
    lockerRepository;
    constructor(lockerRepository) {
        this.lockerRepository = lockerRepository;
    }
    async execute(id) {
        const locker = await this.lockerRepository.findById(id);
        if (!locker) {
            throw new Error('El locker no existe');
        }
        return locker;
    }
}
