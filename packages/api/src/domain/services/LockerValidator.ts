import type { CreateLockerRequest, UpdateLockerRequest } from '@alentapp/shared';
import { ILockerRepository } from '../../application/ports/ILockerRepository.js';
import { Locker } from '../entities/Locker.js';

export class LockerValidator {
    constructor(private readonly lockerRepository: ILockerRepository) {}

    async validateAndCreate(data: CreateLockerRequest): Promise<Locker> {
        this.validateNumber(data.number);
        this.validateLocation(data.location);
        await this.validateNumberIsUnique(data.number);

        return new Locker({
            number: data.number,
            location: data.location.trim(),
            status: 'Available',
            memberId: null,
        });
    }

    validateNumber(number: unknown): void {
        if (number === undefined || number === null) {
            throw new Error('El numero es obligatorio');
        }

        if (typeof number !== 'number' || !Number.isInteger(number) || number <= 0) {
            throw new Error('El numero debe ser un entero positivo');
        }
    }

    validateLocation(location: unknown): void {
        if (typeof location !== 'string' || location.trim().length === 0) {
            throw new Error('La ubicación es obligatoria');
        }
    }

    async validateNumberIsUnique(number: number): Promise<void> {
        const existingLocker = await this.lockerRepository.findByNumber(number);
        if (existingLocker) {
            throw new Error('Ya existe un locker con ese número');
        }
    }

    async validateUpdatedNumberIsUnique(number: number, lockerId: string): Promise<void> {
        const existingLocker = await this.lockerRepository.findByNumber(number);
        if (existingLocker && existingLocker.id !== lockerId) {
            throw new Error('Ya existe un locker con ese número');
        }
    }

    validateUpdateHasFields(data: UpdateLockerRequest): void {
        if (
            data.number === undefined &&
            data.location === undefined &&
            data.status === undefined &&
            data.memberId === undefined
        ) {
            throw new Error('Debe enviar al menos un campo a actualizar');
        }
    }

    validateStatus(status: unknown): void {
        if (status !== 'Maintenance') {
            throw new Error('Estado de locker inválido');
        }
    }

    validateCanAssignMemberToLocker(locker: Locker): void {
        if (locker.status === 'Maintenance') {
            throw new Error('No se puede asignar un socio a un locker en mantenimiento');
        }
    }

    validateCanMoveToMaintenance(memberId: string | null): void {
        if (memberId !== null) {
            throw new Error('No se puede poner un locker en mantenimiento si tiene un miembro asociado');
        }
    }
}
