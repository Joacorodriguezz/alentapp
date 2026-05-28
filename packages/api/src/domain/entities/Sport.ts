export class Sport {
    constructor(
        readonly id: string | undefined,
        readonly name: string,
        readonly description: string | null,
        readonly maxCapacity: number,
        readonly additionalPrice: number | null,
        readonly requiresMedicalCertificate: boolean,
    ) {
        Sport.validateName(name);
        Sport.validateMaxCapacity(maxCapacity);
        Sport.validateAdditionalPrice(additionalPrice);
    }

    update(data: {
        name?: unknown;
        description?: string | null;
        maxCapacity?: number;
        additionalPrice?: number | null;
        requiresMedicalCertificate?: boolean;
    }): Sport {
        if (Object.keys(data).length === 0) {
            throw new Error('Se requiere al menos un campo para actualizar');
        }

        if ('name' in data) {
            throw new Error('El nombre del deporte no puede modificarse');
        }

        if (data.maxCapacity !== undefined) {
            Sport.validateMaxCapacity(data.maxCapacity);
        }

        if (data.additionalPrice !== undefined) {
            Sport.validateUpdateAdditionalPrice(data.additionalPrice);
        }

        return new Sport(
            this.id,
            this.name,
            data.description ?? this.description,
            data.maxCapacity ?? this.maxCapacity,
            data.additionalPrice ?? this.additionalPrice,
            data.requiresMedicalCertificate ?? this.requiresMedicalCertificate,
        );
    }

    private static validateName(name: unknown): void {
        if (!name || typeof name !== 'string' || name.trim().length === 0) {
            throw new Error('El nombre del deporte es obligatorio');
        }
    }

    private static validateMaxCapacity(maxCapacity: unknown): void {
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

    private static validateAdditionalPrice(additionalPrice: number | null): void {
        if (additionalPrice !== null && additionalPrice < 0) {
            throw new Error('El precio adicional no puede ser negativo');
        }
    }

    private static validateUpdateAdditionalPrice(additionalPrice: number | null): void {
        if (additionalPrice !== null && additionalPrice < 0) {
            throw new Error('El precio adicional debe ser mayor o igual a cero');
        }
    }
}