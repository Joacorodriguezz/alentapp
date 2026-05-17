import { PaymentStatus } from '@alentapp/shared';

export class Payment {
    constructor(
        readonly id: string,
        readonly amount: number,
        readonly description: string | null,
        readonly status: PaymentStatus,
        readonly paymentDate: string,
        readonly memberId: string,
        readonly deletedAt: string | null,
        readonly createdAt: string,
        readonly updatedAt: string,
    ) {}

    static validateAmount(amount: number): void {
        if (typeof amount !== 'number' || isNaN(amount)) {
            throw new Error('El monto debe ser un valor numérico');
        }
        if (amount <= 0) {
            throw new Error('El monto debe ser mayor a cero');
        }
    }

    static validatePaymentDate(date: string): void {
        if (!date || isNaN(new Date(date).getTime())) {
            throw new Error('La fecha de pago es inválida o está ausente');
        }
    }
}
