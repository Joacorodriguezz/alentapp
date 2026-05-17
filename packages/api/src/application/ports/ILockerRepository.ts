import { Locker } from '../../domain/entities/Locker.js';

export interface ILockerRepository {
    create(locker: Locker): Promise<Locker>;
    findByNumber(number: number): Promise<Locker | null>;
}
