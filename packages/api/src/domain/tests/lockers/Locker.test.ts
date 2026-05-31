import { describe, it, expect } from 'vitest';
import { Locker } from '../../entities/Locker.js';
import type { LockerStatus } from '@alentapp/shared';

function buildLocker(
    overrides?: Partial<{ status: LockerStatus; memberId: string | null }>,
): Locker {
    return new Locker({
        id: 'locker-1',
        number: 5,
        location: 'Pasillo A',
        status: overrides?.status ?? 'Available',
        memberId: overrides?.memberId ?? null,
    });
}

describe('Locker', () => {
    // TDD-0004: estado inicial por defecto.
    it('debe crearse con estado Available y memberId null por defecto', () => {
        // Dado un número y una ubicación válidos.
        // Cuando se crea el locker sin estado ni socio explícitos.
        const locker = new Locker({ number: 1, location: 'A' });

        // Entonces aplica los valores iniciales del TDD.
        expect(locker.status).toBe('Available');
        expect(locker.memberId).toBeNull();
    });

    // TDD-0004: número obligatorio (ruta de error).
    it('debe lanzar error si el número está ausente', () => {
        expect(() => new Locker({ number: undefined, location: 'A' })).toThrow(
            'El numero es obligatorio',
        );
        expect(() => new Locker({ number: null, location: 'A' })).toThrow(
            'El numero es obligatorio',
        );
    });

    // TDD-0004: número entero positivo. Análisis de valores de frontera.
    it('debe aceptar el número 1 y rechazar 0, negativos y no enteros', () => {
        // Frontera válida mínima.
        expect(() => new Locker({ number: 1, location: 'A' })).not.toThrow();

        // Justo por debajo del mínimo, negativo y no entero.
        expect(() => new Locker({ number: 0, location: 'A' })).toThrow(
            'El numero debe ser un entero positivo',
        );
        expect(() => new Locker({ number: -1, location: 'A' })).toThrow(
            'El numero debe ser un entero positivo',
        );
        expect(() => new Locker({ number: 1.5, location: 'A' })).toThrow(
            'El numero debe ser un entero positivo',
        );
    });

    // TDD-0004: ubicación obligatoria y normalización (trim).
    it('debe exigir ubicación no vacía y recortar los espacios sobrantes', () => {
        expect(() => new Locker({ number: 1, location: '' })).toThrow(
            'La ubicación es obligatoria',
        );
        expect(() => new Locker({ number: 1, location: '   ' })).toThrow(
            'La ubicación es obligatoria',
        );

        const locker = new Locker({ number: 1, location: '  Pasillo A  ' });
        expect(locker.location).toBe('Pasillo A');
    });

    // TDD-0005: asignar socio pasa el locker a Occupied.
    it('debe asignar el socio y pasar a estado Occupied', () => {
        // Dado un locker disponible.
        const locker = buildLocker({ status: 'Available' });

        // Cuando se le asigna un socio.
        locker.assignMember('member-1');

        // Entonces queda ocupado por ese socio.
        expect(locker.memberId).toBe('member-1');
        expect(locker.status).toBe('Occupied');
    });

    // TDD-0005: no se puede asignar socio a un locker en mantenimiento (ruta de error).
    it('debe lanzar error al asignar un socio a un locker en Maintenance', () => {
        const locker = buildLocker({ status: 'Maintenance' });

        expect(() => locker.assignMember('member-1')).toThrow(
            'No se puede asignar un socio a un locker en mantenimiento',
        );
    });

    // TDD-0005: no se puede pasar a Maintenance un locker con socio (ruta de error).
    it('debe lanzar error al pasar a Maintenance un locker con socio asignado', () => {
        const locker = buildLocker({ status: 'Occupied', memberId: 'member-1' });

        expect(() => locker.moveToMaintenance()).toThrow(
            'No se puede poner un locker en mantenimiento si tiene un miembro asociado',
        );
    });

    // TDD-0006: no se puede eliminar un locker asignado a un socio (ruta de error).
    it('debe impedir la eliminación cuando el locker tiene un socio asignado', () => {
        const locker = buildLocker({ status: 'Occupied', memberId: 'member-1' });

        expect(() => locker.ensureCanBeDeleted()).toThrow(
            'No se puede eliminar un locker asignado a un socio',
        );
    });
});
