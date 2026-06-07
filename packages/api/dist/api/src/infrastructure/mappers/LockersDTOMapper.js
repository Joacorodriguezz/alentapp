export class LockerDTOMapper {
    static ToDTO(locker) {
        return {
            id: locker.id,
            number: locker.number,
            location: locker.location,
            status: locker.status,
            memberId: locker.memberId,
        };
    }
}
