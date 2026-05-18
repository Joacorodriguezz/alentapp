import { IPaymentRepository } from '../ports/IPaymentRepository.js';
import { Payment } from '../../domain/entities/Payment.js';

export class DeletePaymentUseCase {
    constructor(private readonly paymentRepository: IPaymentRepository) {}

    async execute(id: string): Promise<Payment> {
        const payment = await this.paymentRepository.findByIdIncludeDeleted(id);
        if (!payment) {
            throw new Error('El pago indicado no existe');
        }
        if (payment.deletedAt !== null || payment.status === 'Canceled') {
            throw new Error('El pago ya se encuentra cancelado');
        }
        if (payment.status === 'Paid') {
            throw new Error('No se puede cancelar un pago ya confirmado como pagado');
        }
        return this.paymentRepository.update(id, {
            status: 'Canceled',
            deletedAt: new Date().toISOString(),
        });
    }
}
