import { FastifyRequest, FastifyReply } from 'fastify';
import { CreatePaymentUseCase } from '../../application/useCases/CreatePaymentUseCase.js';
import { GetPaymentByIdUseCase } from '../../application/useCases/GetPaymentByIdUseCase.js';
import { ListPaymentsUseCase } from '../../application/useCases/ListPaymentsUseCase.js';
import { UpdatePaymentUseCase } from '../../application/useCases/UpdatePaymentUseCase.js';
import { CreatePaymentRequest, PaymentFilters, PaymentStatus, UpdatePaymentRequest } from '@alentapp/shared';
import { PaymentMapper } from '../mappers/PaymentMapper.js';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const VALID_STATUSES: PaymentStatus[] = ['Pending', 'Paid', 'Canceled'];

export class PaymentController {
    constructor(
        private readonly createPaymentUseCase: CreatePaymentUseCase,
        private readonly getPaymentByIdUseCase: GetPaymentByIdUseCase,
        private readonly listPaymentsUseCase: ListPaymentsUseCase,
        private readonly updatePaymentUseCase: UpdatePaymentUseCase,
    ) {}

    async getById(
        request: FastifyRequest<{ Params: { id: string } }>,
        reply: FastifyReply,
    ) {
        const { id } = request.params;
        if (!UUID_REGEX.test(id)) {
            return reply.status(400).send({ error: 'El identificador proporcionado no es válido' });
        }
        try {
            const payment = await this.getPaymentByIdUseCase.execute(id);
            return reply.status(200).send({ data: PaymentMapper.toDTO(payment) });
        } catch (error: any) {
            if (error.message === 'El pago indicado no existe') {
                return reply.status(404).send({ error: error.message });
            }
            return reply.status(500).send({ error: 'Error interno, reintente más tarde' });
        }
    }

    async getAll(
        request: FastifyRequest<{ Querystring: { memberId?: string; status?: string } }>,
        reply: FastifyReply,
    ) {
        const { memberId, status } = request.query;
        if (status !== undefined && !VALID_STATUSES.includes(status as PaymentStatus)) {
            return reply.status(400).send({ error: 'El estado indicado no es válido' });
        }
        const filters: PaymentFilters = {};
        if (memberId) filters.memberId = memberId;
        if (status) filters.status = status as PaymentStatus;
        try {
            const payments = await this.listPaymentsUseCase.execute(filters);
            return reply.status(200).send({ data: payments.map(PaymentMapper.toDTO) });
        } catch {
            return reply.status(500).send({ error: 'Error interno, reintente más tarde' });
        }
    }

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
            if (
                error.message === 'El monto debe ser mayor a cero' ||
                error.message === 'El monto debe ser un valor numérico' ||
                error.message === 'La fecha de pago es inválida o está ausente' ||
                error.message === 'Datos inválidos'
            ) {
                return reply.status(400).send({ error: error.message });
            }
            return reply.status(500).send({ error: 'Error interno, reintente más tarde' });
        }
    }

    async update(
        request: FastifyRequest<{ Params: { id: string }; Body: UpdatePaymentRequest }>,
        reply: FastifyReply,
    ) {
        const { id } = request.params;
        if (!UUID_REGEX.test(id)) {
            return reply.status(400).send({ error: 'El identificador proporcionado no es válido' });
        }
        try {
            const payment = await this.updatePaymentUseCase.execute(id, request.body);
            return reply.status(200).send({ data: PaymentMapper.toDTO(payment) });
        } catch (error: any) {
            if (error.message === 'El pago indicado no existe') {
                return reply.status(404).send({ error: error.message });
            }
            if (error.message === 'No se puede modificar un pago cancelado') {
                return reply.status(409).send({ error: error.message });
            }
            if (
                error.message === 'El monto solo puede modificarse si el pago está pendiente' ||
                error.message === 'Transición de estado no permitida'
            ) {
                return reply.status(422).send({ error: error.message });
            }
            if (
                error.message === 'Debe proveer al menos un campo para actualizar' ||
                error.message === 'El monto debe ser mayor a cero' ||
                error.message === 'El monto debe ser un valor numérico'
            ) {
                return reply.status(400).send({ error: error.message });
            }
            return reply.status(500).send({ error: 'Error interno, reintente más tarde' });
        }
    }
}
