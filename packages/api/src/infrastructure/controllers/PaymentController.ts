import { FastifyRequest, FastifyReply } from 'fastify';
import { CreatePaymentUseCase } from '../../application/useCases/CreatePaymentUseCase.js';
import { GetPaymentsUseCase } from '../../application/useCases/GetPaymentsUseCase.js';
import { CreatePaymentRequest } from '@alentapp/shared';
import { PaymentMapper } from '../mappers/PaymentMapper.js';

export class PaymentController {
    constructor(
        private readonly createPaymentUseCase: CreatePaymentUseCase,
        private readonly getPaymentsUseCase: GetPaymentsUseCase
    ) {}

    async create(
        request: FastifyRequest<{ Body: CreatePaymentRequest }>,
        reply: FastifyReply,
    ) {
        try {
            const payment = await this.createPaymentUseCase.execute(request.body);
            return reply.status(201).send({ data: PaymentMapper.toDTO(payment) });
        } catch (error: any) {
            if (error.message === 'El socio indicado no existe') {
                return reply.status(404).send({ error: error.message });
            }
            if (error.message.includes('monto') || error.message.includes('fecha')) {
                return reply.status(400).send({ error: error.message });
            }
            return reply.status(500).send({ error: 'Error interno, reintente más tarde' });
        }
    }

    async getAll(_request: FastifyRequest, reply: FastifyReply) {
        try {
            const payments = await this.getPaymentsUseCase.execute();
            return reply.status(200).send({ data: payments.map(PaymentMapper.toDTO) });
        } catch (error: any) {
            return reply.status(500).send({ error: 'Error interno, reintente más tarde' });
        }
    }
}
