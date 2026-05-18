import { Locker } from '../../domain/entities/Locker.js';

export interface ILockerRepository {
    create(locker: Locker): Promise<Locker>;
    findByNumber(number: number): Promise<Locker | null>;
    findAll(): Promise<Locker[]>;
    findById(id: string): Promise<Locker | null>;
}
