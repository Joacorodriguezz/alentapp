import { randomUUID } from 'node:crypto';
import type { LockerStatus } from '@alentapp/shared';

type LockerProps = {
    id?: string;
    number: unknown;
    location: unknown;
    status?: LockerStatus;
    memberId?: string | null;
};

export class Locker {
    readonly id: string;
    number: number;
    location: string;
    status: LockerStatus;
    memberId: string | null;

    constructor(props: LockerProps) {
        this.id = props.id ?? randomUUID();
        this.number = Locker.validateNumber(props.number);
        this.location = Locker.validateLocation(props.location);
        this.status = props.status ?? 'Available';
        this.memberId = props.memberId ?? null;
    }

    updateNumber(number: number): void {
        this.number = Locker.validateNumber(number);
    }

    updateLocation(location: string): void {
        this.location = Locker.validateLocation(location);
    }

    assignMember(memberId: string): void {
        if (this.status === 'Maintenance') {
            throw new Error('No se puede asignar un socio a un locker en mantenimiento');
        }

        this.memberId = memberId;
        this.status = 'Occupied';
    }

    unassignMember(): void {
        this.memberId = null;
        this.status = 'Available';
    }

    moveToMaintenance(): void {
        if (this.memberId !== null) {
            throw new Error('No se puede poner un locker en mantenimiento si tiene un miembro asociado');
        }

        this.memberId = null;
        this.status = 'Maintenance';
    }

    ensureCanBeDeleted(): void {
        if (this.memberId !== null) {
            throw new Error('No se puede eliminar un locker asignado a un socio');
        }
    }

    private static validateNumber(number: unknown): number {
        if (number === undefined || number === null) {
            throw new Error('El numero es obligatorio');
        }

        if (typeof number !== 'number' || !Number.isInteger(number) || number <= 0) {
            throw new Error('El numero debe ser un entero positivo');
        }

        return number;
    }

    private static validateLocation(location: unknown): string {
        if (typeof location !== 'string' || location.trim().length === 0) {
            throw new Error('La ubicación es obligatoria');
        }

        return location.trim();
    }
}
