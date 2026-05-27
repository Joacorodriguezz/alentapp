export class PaymentValidator {
    validateRequiredFields(data: {
        amount?: number;
        paymentDate?: string;
        memberId?: string;
    } | null | undefined): void {
        if (
            !data ||
            data.amount === undefined ||
            data.amount === null ||
            !data.paymentDate ||
            !data.memberId
        ) {
            throw new Error('Datos inválidos');
        }
    }

    validateAmount(amount: number): void {
        if (typeof amount !== 'number' || isNaN(amount)) {
            throw new Error('El monto debe ser un valor numérico');
        }
        if (amount <= 0) {
            throw new Error('El monto debe ser mayor a cero');
        }
    }

    validatePaymentDate(date: string): void {
        if (!date || isNaN(new Date(date).getTime())) {
            throw new Error('La fecha de pago es inválida o está ausente');
        }
    }
}
