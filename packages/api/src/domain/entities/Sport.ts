export class Sport {
    constructor(
        readonly id: string | undefined,
        readonly name: string,
        readonly description: string | null,
        readonly maxCapacity: number,
        readonly additionalPrice: number | null,
        readonly requiresMedicalCertificate: boolean,
    ) {}

    update(data: {
        description?: string | null;
        maxCapacity?: number;
        additionalPrice?: number | null;
        requiresMedicalCertificate?: boolean;
    }): Sport {
        return new Sport(
            this.id,
            this.name,
            data.description ?? this.description,
            data.maxCapacity ?? this.maxCapacity,
            data.additionalPrice ?? this.additionalPrice,
            data.requiresMedicalCertificate ?? this.requiresMedicalCertificate,
        );
    }
}