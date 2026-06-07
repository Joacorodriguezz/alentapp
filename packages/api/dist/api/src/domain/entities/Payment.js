export class Payment {
    id;
    amount;
    description;
    status;
    paymentDate;
    memberId;
    deletedAt;
    createdAt;
    updatedAt;
    constructor(id, amount, description, status, paymentDate, memberId, deletedAt, createdAt, updatedAt) {
        this.id = id;
        this.amount = amount;
        this.description = description;
        this.status = status;
        this.paymentDate = paymentDate;
        this.memberId = memberId;
        this.deletedAt = deletedAt;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }
    static create(id, amount, description, paymentDate, memberId) {
        if (amount === undefined ||
            amount === null ||
            !paymentDate ||
            !memberId) {
            throw new Error('Datos inválidos');
        }
        Payment.validateAmount(amount);
        Payment.validatePaymentDate(paymentDate);
        return new Payment(id, amount, description, 'Pending', paymentDate, memberId, null, '', '');
    }
    updateAmount(amount) {
        this.ensureModifiable();
        if (this.status !== 'Pending') {
            throw new Error('El monto solo puede modificarse si el pago está pendiente');
        }
        Payment.validateAmount(amount);
        this.amount = amount;
    }
    updateDescription(description) {
        this.ensureModifiable();
        this.description = description;
    }
    markAsPaid() {
        this.ensureModifiable();
        if (this.status !== 'Pending') {
            throw new Error('Transición de estado no permitida');
        }
        this.status = 'Paid';
    }
    cancel() {
        if (this.deletedAt !== null || this.status === 'Canceled') {
            throw new Error('El pago ya se encuentra cancelado');
        }
        if (this.status === 'Paid') {
            throw new Error('No se puede cancelar un pago ya confirmado como pagado');
        }
        this.status = 'Canceled';
        this.deletedAt = new Date().toISOString();
    }
    ensureModifiable() {
        if (this.deletedAt !== null || this.status === 'Canceled') {
            throw new Error('No se puede modificar un pago cancelado');
        }
    }
    static validateAmount(amount) {
        if (typeof amount !== 'number' || isNaN(amount)) {
            throw new Error('El monto debe ser un valor numérico');
        }
        if (amount <= 0) {
            throw new Error('El monto debe ser mayor a cero');
        }
    }
    static validatePaymentDate(date) {
        if (!date || isNaN(new Date(date).getTime())) {
            throw new Error('La fecha de pago es inválida o está ausente');
        }
    }
}
