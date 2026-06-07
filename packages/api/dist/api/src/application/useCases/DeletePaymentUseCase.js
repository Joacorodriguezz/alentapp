export class DeletePaymentUseCase {
    paymentRepository;
    constructor(paymentRepository) {
        this.paymentRepository = paymentRepository;
    }
    async execute(id) {
        const payment = await this.paymentRepository.findByIdIncludeDeleted(id);
        if (!payment) {
            throw new Error('El pago indicado no existe');
        }
        payment.cancel();
        return this.paymentRepository.update(payment);
    }
}
