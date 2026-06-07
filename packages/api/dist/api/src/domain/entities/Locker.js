import { randomUUID } from 'node:crypto';
export class Locker {
    id;
    number;
    location;
    status;
    memberId;
    constructor(props) {
        this.id = props.id ?? randomUUID();
        this.number = Locker.validateNumber(props.number);
        this.location = Locker.validateLocation(props.location);
        this.status = props.status ?? 'Available';
        this.memberId = props.memberId ?? null;
    }
    updateNumber(number) {
        this.number = Locker.validateNumber(number);
    }
    updateLocation(location) {
        this.location = Locker.validateLocation(location);
    }
    assignMember(memberId) {
        if (this.status === 'Maintenance') {
            throw new Error('No se puede asignar un socio a un locker en mantenimiento');
        }
        this.memberId = memberId;
        this.status = 'Occupied';
    }
    unassignMember() {
        this.memberId = null;
        this.status = 'Available';
    }
    moveToMaintenance() {
        if (this.memberId !== null) {
            throw new Error('No se puede poner un locker en mantenimiento si tiene un miembro asociado');
        }
        this.memberId = null;
        this.status = 'Maintenance';
    }
    ensureCanBeDeleted() {
        if (this.memberId !== null) {
            throw new Error('No se puede eliminar un locker asignado a un socio');
        }
    }
    static validateNumber(number) {
        if (number === undefined || number === null) {
            throw new Error('El numero es obligatorio');
        }
        if (typeof number !== 'number' || !Number.isInteger(number) || number <= 0) {
            throw new Error('El numero debe ser un entero positivo');
        }
        return number;
    }
    static validateLocation(location) {
        if (typeof location !== 'string' || location.trim().length === 0) {
            throw new Error('La ubicación es obligatoria');
        }
        return location.trim();
    }
}
