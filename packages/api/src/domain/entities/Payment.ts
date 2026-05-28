import { PaymentStatus } from '@alentapp/shared';

export class Payment {
    constructor(
        public readonly id: string,
        public amount: number,
        public description: string | null,
        public status: PaymentStatus,
        public readonly paymentDate: string,
        public readonly memberId: string,
        public deletedAt: string | null,
        public readonly createdAt: string,
        public updatedAt: string,
    ) {}

    static create(
        id: string,
        amount: number,
        description: string | null,
        paymentDate: string,
        memberId: string,
    ): Payment {
        if (
            amount === undefined ||
            amount === null ||
            !paymentDate ||
            !memberId
        ) {
            throw new Error('Datos inválidos');
        }

        Payment.validateAmount(amount);
        Payment.validatePaymentDate(paymentDate);

        return new Payment(
            id,
            amount,
            description,
            'Pending',
            paymentDate,
            memberId,
            null,
            '',
            '',
        );
    }

    updateAmount(amount: number): void {
        this.ensureModifiable();

        if (this.status !== 'Pending') {
            throw new Error('El monto solo puede modificarse si el pago está pendiente');
        }

        Payment.validateAmount(amount);
        this.amount = amount;
    }

    updateDescription(description: string): void {
        this.ensureModifiable();
        this.description = description;
    }

    markAsPaid(): void {
        this.ensureModifiable();

        if (this.status !== 'Pending') {
            throw new Error('Transición de estado no permitida');
        }

        this.status = 'Paid';
    }

    cancel(): void {
        if (this.deletedAt !== null || this.status === 'Canceled') {
            throw new Error('El pago ya se encuentra cancelado');
        }

        if (this.status === 'Paid') {
            throw new Error('No se puede cancelar un pago ya confirmado como pagado');
        }

        this.status = 'Canceled';
        this.deletedAt = new Date().toISOString();
    }

    private ensureModifiable(): void {
        if (this.deletedAt !== null || this.status === 'Canceled') {
            throw new Error('No se puede modificar un pago cancelado');
        }
    }

    private static validateAmount(amount: number): void {
        if (typeof amount !== 'number' || isNaN(amount)) {
            throw new Error('El monto debe ser un valor numérico');
        }
        if (amount <= 0) {
            throw new Error('El monto debe ser mayor a cero');
        }
    }

    private static validatePaymentDate(date: string): void {
        if (!date || isNaN(new Date(date).getTime())) {
            throw new Error('La fecha de pago es inválida o está ausente');
        }
    }
}
