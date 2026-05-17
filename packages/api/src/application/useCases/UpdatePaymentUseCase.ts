import { UpdatePaymentRequest } from '@alentapp/shared';
import { IPaymentRepository } from '../ports/IPaymentRepository.js';
import { Payment } from '../../domain/entities/Payment.js';

export class UpdatePaymentUseCase {
    constructor(private readonly paymentRepository: IPaymentRepository) {}

    async execute(id: string, data: UpdatePaymentRequest): Promise<Payment> {
        if (data.amount === undefined && data.description === undefined && data.status === undefined) {
            throw new Error('Debe proveer al menos un campo para actualizar');
        }

        const payment = await this.paymentRepository.findById(id);
        if (!payment) {
            throw new Error('El pago indicado no existe');
        }

        if (payment.status === 'Canceled') {
            throw new Error('No se puede modificar un pago cancelado');
        }

        if (data.amount !== undefined) {
            if (payment.status !== 'Pending') {
                throw new Error('El monto solo puede modificarse si el pago está pendiente');
            }
            Payment.validateAmount(data.amount);
        }

        if (data.status !== undefined) {
            if (!(payment.status === 'Pending' && data.status === 'Paid')) {
                throw new Error('Transición de estado no permitida');
            }
        }

        return this.paymentRepository.update(id, {
            ...(data.amount !== undefined && { amount: data.amount }),
            ...(data.description !== undefined && { description: data.description }),
            ...(data.status !== undefined && { status: data.status }),
        });
    }
}
