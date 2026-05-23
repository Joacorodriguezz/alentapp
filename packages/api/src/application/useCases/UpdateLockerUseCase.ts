import type { UpdateLockerRequest } from '@alentapp/shared';
import { ILockerRepository, UpdateLockerData } from '../ports/ILockerRepository.js';
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
        this.lockerValidator.validateUpdateHasFields(data);

        const locker = await this.lockerRepository.findById(id);
        if (!locker) {
            throw new Error('El locker solicitado no existe');
        }

        const updateData: UpdateLockerData = {};

        if (data.number !== undefined) {
            this.lockerValidator.validateNumber(data.number);
            await this.lockerValidator.validateUpdatedNumberIsUnique(data.number, locker.id);
            updateData.number = data.number;
        }

        if (data.location !== undefined) {
            this.lockerValidator.validateLocation(data.location);
            updateData.location = data.location.trim();
        }

        if (data.status !== undefined) {
            this.lockerValidator.validateStatus(data.status);
        }

        if (data.memberId !== undefined) {
            if (data.memberId !== null) {
                if (data.status === 'Maintenance') {
                    throw new Error('No se puede asignar un socio a un locker en mantenimiento');
                }

                this.lockerValidator.validateCanAssignMemberToLocker(locker);

                const member = await this.memberRepository.findById(data.memberId);
                if (!member) {
                    throw new Error('El socio solicitado no existe');
                }

                updateData.memberId = data.memberId;
                updateData.status = 'Occupied';
            } else {
                updateData.memberId = null;
                updateData.status = 'Available';
            }
        }

        if (data.status === 'Maintenance') {
            const finalMemberId = data.memberId === undefined ? locker.memberId : data.memberId;
            this.lockerValidator.validateCanMoveToMaintenance(finalMemberId);
            updateData.status = 'Maintenance';
            updateData.memberId = null;
        }

        return this.lockerRepository.update(id, updateData);
    }
}
