export class Sport {
    id;
    name;
    description;
    maxCapacity;
    additionalPrice;
    requiresMedicalCertificate;
    constructor(id, name, description, maxCapacity, additionalPrice, requiresMedicalCertificate) {
        this.id = id;
        this.name = name;
        this.description = description;
        this.maxCapacity = maxCapacity;
        this.additionalPrice = additionalPrice;
        this.requiresMedicalCertificate = requiresMedicalCertificate;
        Sport.validateName(name);
        Sport.validateMaxCapacity(maxCapacity);
        Sport.validateAdditionalPrice(additionalPrice);
    }
    update(data) {
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
        return new Sport(this.id, this.name, data.description ?? this.description, data.maxCapacity ?? this.maxCapacity, data.additionalPrice ?? this.additionalPrice, data.requiresMedicalCertificate ?? this.requiresMedicalCertificate);
    }
    static validateName(name) {
        if (!name || typeof name !== 'string' || name.trim().length === 0) {
            throw new Error('El nombre del deporte es obligatorio');
        }
    }
    static validateMaxCapacity(maxCapacity) {
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
    static validateAdditionalPrice(additionalPrice) {
        if (additionalPrice !== null && additionalPrice < 0) {
            throw new Error('El precio adicional no puede ser negativo');
        }
    }
    static validateUpdateAdditionalPrice(additionalPrice) {
        if (additionalPrice !== null && additionalPrice < 0) {
            throw new Error('El precio adicional debe ser mayor o igual a cero');
        }
    }
}
