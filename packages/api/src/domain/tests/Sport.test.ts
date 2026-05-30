import { describe, it, expect } from 'vitest';
import { Sport } from '../entities/Sport.js';

const SPORT_ID = '550e8400-e29b-41d4-a716-446655440000';

function buildSport(
    overrides?: Partial<{
        name: string;
        maxCapacity: number;
        additionalPrice: number | null;
    }>,
): Sport {
    return new Sport(
        SPORT_ID,
        overrides?.name ?? 'Fútbol',
        'Deporte de equipo',
        overrides?.maxCapacity ?? 20,
        overrides?.additionalPrice ?? null,
        false,
    );
}

describe('Sport Entity', () => {
    it('debe crear un deporte válido', () => {
        const sport = buildSport({ name: 'Natación', maxCapacity: 15 });

        expect(sport.name).toBe('Natación');
        expect(sport.maxCapacity).toBe(15);
    });

    it('debe rechazar datos inválidos al crear', () => {
        expect(() => buildSport({ name: '' })).toThrow('El nombre del deporte es obligatorio');
        expect(() => buildSport({ maxCapacity: 0 })).toThrow(
            'La capacidad máxima debe ser mayor a cero',
        );
        expect(() => buildSport({ additionalPrice: -100 })).toThrow(
            'El precio adicional no puede ser negativo',
        );
    });

    it('debe actualizar campos permitidos', () => {
        const updated = buildSport().update({ description: 'Nueva descripción', maxCapacity: 30 });

        expect(updated.description).toBe('Nueva descripción');
        expect(updated.maxCapacity).toBe(30);
        expect(updated.name).toBe('Fútbol');
    });

    it('debe rechazar actualizaciones inválidas', () => {
        const sport = buildSport();

        expect(() => sport.update({})).toThrow('Se requiere al menos un campo para actualizar');
        expect(() => sport.update({ name: 'Tenis' })).toThrow(
            'El nombre del deporte no puede modificarse',
        );
    });
});
