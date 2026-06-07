import { Locker } from '../../domain/entities/Locker.js';
export class LockerPersistenceMapper {
    static ToPersistence(locker) {
        return {
            id: locker.id,
            number: locker.number,
            location: locker.location,
            status: locker.status,
            memberId: locker.memberId,
        };
    }
    static ToDomain(locker) {
        return new Locker({
            id: locker.id,
            number: locker.number,
            location: locker.location,
            status: locker.status,
            memberId: locker.memberId,
        });
    }
}
