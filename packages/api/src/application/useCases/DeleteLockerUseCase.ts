import { ILockerRepository } from '../ports/ILockerRepository.js';
import { LockerValidator } from '../../domain/services/LockerValidator.js';

export class DeleteLockerUseCase {
    constructor(
        private readonly lockerRepository: ILockerRepository,
        private readonly lockerValidator: LockerValidator,
    ) {}

    async execute(id: string): Promise<{ id: string }> {
        const locker = this.lockerValidator.validateExists(
            await this.lockerRepository.findById(id),
        );
        locker.ensureCanBeDeleted();

        await this.lockerRepository.delete(id);
        return { id };
    }
}
