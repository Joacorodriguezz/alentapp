export class UpdateLockerUseCase {
    lockerRepository;
    memberRepository;
    lockerValidator;
    constructor(lockerRepository, memberRepository, lockerValidator) {
        this.lockerRepository = lockerRepository;
        this.memberRepository = memberRepository;
        this.lockerValidator = lockerValidator;
    }
    async execute(id, data) {
        if (data.number === undefined &&
            data.location === undefined &&
            data.status === undefined &&
            data.memberId === undefined) {
            throw new Error('Debe enviar al menos un campo a actualizar');
        }
        const locker = this.lockerValidator.validateExists(await this.lockerRepository.findById(id), 'El locker solicitado no existe');
        if (data.number !== undefined) {
            locker.updateNumber(data.number);
            await this.lockerValidator.validateUpdatedNumberIsUnique(locker.number, locker.id);
        }
        if (data.location !== undefined) {
            locker.updateLocation(data.location);
        }
        const movesToMaintenance = data.status === 'Maintenance';
        if (data.status !== undefined && !movesToMaintenance) {
            throw new Error('Estado de locker inválido');
        }
        if (data.memberId !== undefined) {
            if (data.memberId !== null) {
                if (movesToMaintenance) {
                    throw new Error('No se puede asignar un socio a un locker en mantenimiento');
                }
                const member = await this.memberRepository.findById(data.memberId);
                if (!member) {
                    throw new Error('El socio solicitado no existe');
                }
                locker.assignMember(data.memberId);
            }
            else {
                locker.unassignMember();
            }
        }
        if (movesToMaintenance) {
            locker.moveToMaintenance();
        }
        return this.lockerRepository.update(id, {
            number: locker.number,
            location: locker.location,
            status: locker.status,
            memberId: locker.memberId,
        });
    }
}
