import { Locker } from '../../domain/entities/Locker.js';

type DBLocker = {
    id: string;
    number: number;
    location: string;
    status: 'Available' | 'Occupied' | 'Maintenance';
    memberId: string | null;
};

export class LockerPersistenceMapper {
    static ToPersistence(locker: Locker) {
        return {
            id: locker.id,
            number: locker.number,
            location: locker.location,
            status: locker.status,
            memberId: locker.memberId,
        };
    }

    static ToDomain(locker: DBLocker): Locker {
        return new Locker({
            id: locker.id,
            number: locker.number,
            location: locker.location,
            status: locker.status,
            memberId: locker.memberId,
        });
    }
}
