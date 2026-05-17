import { ISportRepository } from '../../application/ports/ISportRepository.js';

export class SportValidator {
    constructor(private readonly sportRepository: ISportRepository) {}

    validateName(name: unknown): void {
        if (!name || typeof name !== 'string' || name.trim().length === 0) {
            throw new Error('El nombre del deporte es obligatorio');
        }
    }

    async validateNameIsUnique(name: string): Promise<void> {
        const sport = await this.sportRepository.findByName(name);
        if (sport) {
            throw new Error('El deporte ya existe');
        }
    }

    validateMaxCapacity(maxCapacity: unknown): void {
        if (maxCapacity === undefined || maxCapacity === null) {
            throw new Error('La capacidad máxima es obligatoria');
        }
        if (typeof maxCapacity !== 'number' || !Number.isInteger(maxCapacity)) {
            throw new Error('La capacidad máxima debe ser un numero entero');
        }
        if (maxCapacity <= 0) {
            throw new Error('La capacidad máxima debe ser mayor a cero');
        }
    }

    validateAdditionalPrice(additionalPrice?: number): void {
        if (additionalPrice !== undefined && additionalPrice < 0) {
            throw new Error('El precio adicional no puede ser negativo');
        }
    }
}
