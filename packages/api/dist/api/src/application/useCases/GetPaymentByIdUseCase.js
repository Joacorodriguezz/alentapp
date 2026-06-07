export class GetPaymentByIdUseCase {
    paymentRepository;
    constructor(paymentRepository) {
        this.paymentRepository = paymentRepository;
    }
    async execute(id) {
        const payment = await this.paymentRepository.findById(id);
        if (!payment) {
            throw new Error('El pago indicado no existe');
        }
        return payment;
    }
}
