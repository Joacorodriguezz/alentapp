export class UpdatePaymentUseCase {
    paymentRepository;
    constructor(paymentRepository) {
        this.paymentRepository = paymentRepository;
    }
    async execute(id, data) {
        if (data.amount === undefined && data.description === undefined && data.status === undefined) {
            throw new Error('Debe proveer al menos un campo para actualizar');
        }
        const payment = await this.paymentRepository.findByIdIncludeDeleted(id);
        if (!payment) {
            throw new Error('El pago indicado no existe');
        }
        if (data.amount !== undefined) {
            payment.updateAmount(data.amount);
        }
        if (data.description !== undefined) {
            payment.updateDescription(data.description);
        }
        if (data.status !== undefined) {
            payment.markAsPaid();
        }
        return this.paymentRepository.update(payment);
    }
}
