export class Sport {
    constructor(
        readonly id: string | undefined,
        readonly name: string,
        readonly description: string | null,
        readonly maxCapacity: number,
        readonly additionalPrice: number | null,
        readonly requiresMedicalCertificate: boolean,
    ) {}
}
