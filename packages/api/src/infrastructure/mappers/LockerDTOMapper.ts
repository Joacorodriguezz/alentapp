import type { LockerResponse } from '@alentapp/shared';
import { Locker } from '../../domain/entities/Locker.js';

export class LockerDTOMapper {
    static ToDTO(locker: Locker): LockerResponse {
        return {
            id: locker.id,
            number: locker.number,
            location: locker.location,
            status: locker.status,
            memberId: locker.memberId,
        };
    }
}
