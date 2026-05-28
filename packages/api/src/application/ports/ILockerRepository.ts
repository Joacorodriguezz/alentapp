import { Locker } from '../../domain/entities/Locker.js';
import type { LockerStatus } from '@alentapp/shared';

export type LockerUpdateData = {
    number: number;
    location: string;
    status: LockerStatus;
    memberId: string | null;
};

export interface ILockerRepository {
    create(locker: Locker): Promise<Locker>;
    findByNumber(number: number): Promise<Locker | null>;
    findAll(): Promise<Locker[]>;
    findById(id: string): Promise<Locker | null>;
    delete(id: string): Promise<void>;
    update(id: string, data: LockerUpdateData): Promise<Locker>;
}
