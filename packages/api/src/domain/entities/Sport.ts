type SportProps = {
    id?: string;
    name: string;
    description?: string | null;
    maxCapacity: number;
    additionalPrice?: number | null;
    requiresMedicalCertificate: boolean;
};

export class Sport {
    constructor(private readonly props: SportProps) {}

    get id(): string | undefined {
        return this.props.id;
    }

    get name(): string {
        return this.props.name;
    }

    get description(): string | null {
        return this.props.description ?? null;
    }

    get maxCapacity(): number {
        return this.props.maxCapacity;
    }

    get additionalPrice(): number | null {
        return this.props.additionalPrice ?? null;
    }

    get requiresMedicalCertificate(): boolean {
        return this.props.requiresMedicalCertificate;
    }
}
