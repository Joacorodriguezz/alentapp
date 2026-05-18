import { ILockerRepository } from '../ports/ILockerRepository.js';
import { LockerValidator } from '../../domain/services/LockerValidator.js';

export class DeleteLockerUseCase {
    constructor(
        private readonly lockerRepository: ILockerRepository,
        private readonly lockerValidator: LockerValidator,
    ) {}

    async execute(id: string): Promise<{ id: string }> {
        if (!this.isValidId(id)) {
            throw new Error('El id del locker es inválido');
        }

        const locker = this.lockerValidator.validateExists(
            await this.lockerRepository.findById(id),
        );
        this.lockerValidator.validateCanDelete(locker);

        await this.lockerRepository.delete(id);
        return { id };
    }

    private isValidId(id: string): boolean {
        return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
    }
}
