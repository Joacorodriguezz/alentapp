import type { UpdateLockerRequest } from '@alentapp/shared';
import { ILockerRepository } from '../ports/ILockerRepository.js';
import { IMemberRepository } from '../ports/IMemberRepository.js';
import { Locker } from '../../domain/entities/Locker.js';
import { LockerValidator } from '../../domain/services/LockerValidator.js';

export class UpdateLockerUseCase {
    constructor(
        private readonly lockerRepository: ILockerRepository,
        private readonly memberRepository: IMemberRepository,
        private readonly lockerValidator: LockerValidator,
    ) {}

    async execute(id: string, data: UpdateLockerRequest): Promise<Locker> {
        if (
            data.number === undefined &&
            data.location === undefined &&
            data.status === undefined &&
            data.memberId === undefined
        ) {
            throw new Error('Debe enviar al menos un campo a actualizar');
        }

        const locker = this.lockerValidator.validateExists(
            await this.lockerRepository.findById(id),
            'El locker solicitado no existe',
        );

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
            } else {
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
