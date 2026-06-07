export class ListPaymentsUseCase {
    paymentRepository;
    constructor(paymentRepository) {
        this.paymentRepository = paymentRepository;
    }
    async execute(filters) {
        return this.paymentRepository.findAll(filters);
    }
}
