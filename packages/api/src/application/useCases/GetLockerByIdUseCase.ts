import { Locker } from '../../domain/entities/Locker.js';
import { ILockerRepository } from '../ports/ILockerRepository.js';

export class GetLockerByIdUseCase {
    constructor(private readonly lockerRepository: ILockerRepository) {}

    async execute(id: string): Promise<Locker> {
        if (!this.isValidId(id)) {
            throw new Error('El id del locker es inválido');
        }

        const locker = await this.lockerRepository.findById(id);

        if (!locker) {
            throw new Error('El locker no existe');
        }

        return locker;
    }

    private isValidId(id: string): boolean {
        return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
    }
}
