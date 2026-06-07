import { PaymentMapper } from '../mappers/PaymentMapper.js';
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const VALID_STATUSES = ['Pending', 'Paid', 'Canceled'];
export class PaymentController {
    createPaymentUseCase;
    getPaymentByIdUseCase;
    listPaymentsUseCase;
    updatePaymentUseCase;
    deletePaymentUseCase;
    constructor(createPaymentUseCase, getPaymentByIdUseCase, listPaymentsUseCase, updatePaymentUseCase, deletePaymentUseCase) {
        this.createPaymentUseCase = createPaymentUseCase;
        this.getPaymentByIdUseCase = getPaymentByIdUseCase;
        this.listPaymentsUseCase = listPaymentsUseCase;
        this.updatePaymentUseCase = updatePaymentUseCase;
        this.deletePaymentUseCase = deletePaymentUseCase;
    }
    async getById(request, reply) {
        const { id } = request.params;
        if (!UUID_REGEX.test(id)) {
            return reply.status(400).send({ error: 'El identificador proporcionado no es válido' });
        }
        try {
            const payment = await this.getPaymentByIdUseCase.execute(id);
            return reply.status(200).send({ data: PaymentMapper.toDTO(payment) });
        }
        catch (error) {
            const message = error instanceof Error ? error.message : '';
            if (message === 'El pago indicado no existe') {
                return reply.status(404).send({ error: message });
            }
            return reply.status(500).send({ error: 'Error interno, reintente más tarde' });
        }
    }
    async getAll(request, reply) {
        const { memberId, status } = request.query;
        if (status !== undefined && !VALID_STATUSES.includes(status)) {
            return reply.status(400).send({ error: 'El estado indicado no es válido' });
        }
        const filters = {};
        if (memberId)
            filters.memberId = memberId;
        if (status)
            filters.status = status;
        try {
            const payments = await this.listPaymentsUseCase.execute(filters);
            return reply.status(200).send({ data: payments.map(PaymentMapper.toDTO) });
        }
        catch {
            return reply.status(500).send({ error: 'Error interno, reintente más tarde' });
        }
    }
    async create(request, reply) {
        try {
            const payment = await this.createPaymentUseCase.execute(request.body);
            return reply.status(201).send({ data: PaymentMapper.toDTO(payment) });
        }
        catch (error) {
            const message = error instanceof Error ? error.message : '';
            if (message === 'El socio indicado no existe') {
                return reply.status(404).send({ error: message });
            }
            if (message === 'El monto debe ser mayor a cero' ||
                message === 'El monto debe ser un valor numérico' ||
                message === 'La fecha de pago es inválida o está ausente' ||
                message === 'Datos inválidos') {
                return reply.status(400).send({ error: message });
            }
            return reply.status(500).send({ error: 'Error interno, reintente más tarde' });
        }
    }
    async delete(request, reply) {
        const { id } = request.params;
        if (!UUID_REGEX.test(id)) {
            return reply.status(400).send({ error: 'El identificador proporcionado no es válido' });
        }
        try {
            const payment = await this.deletePaymentUseCase.execute(id);
            return reply.status(200).send({ data: PaymentMapper.toDTO(payment) });
        }
        catch (error) {
            const message = error instanceof Error ? error.message : '';
            if (message === 'El pago indicado no existe') {
                return reply.status(404).send({ error: message });
            }
            if (message === 'El pago ya se encuentra cancelado') {
                return reply.status(409).send({ error: message });
            }
            if (message === 'No se puede cancelar un pago ya confirmado como pagado') {
                return reply.status(422).send({ error: message });
            }
            return reply.status(500).send({ error: 'Error interno, reintente más tarde' });
        }
    }
    async update(request, reply) {
        const { id } = request.params;
        if (!UUID_REGEX.test(id)) {
            return reply.status(400).send({ error: 'El identificador proporcionado no es válido' });
        }
        try {
            const payment = await this.updatePaymentUseCase.execute(id, request.body);
            return reply.status(200).send({ data: PaymentMapper.toDTO(payment) });
        }
        catch (error) {
            const message = error instanceof Error ? error.message : '';
            if (message === 'El pago indicado no existe') {
                return reply.status(404).send({ error: message });
            }
            if (message === 'No se puede modificar un pago cancelado') {
                return reply.status(409).send({ error: message });
            }
            if (message === 'El monto solo puede modificarse si el pago está pendiente' ||
                message === 'Transición de estado no permitida') {
                return reply.status(422).send({ error: message });
            }
            if (message === 'Debe proveer al menos un campo para actualizar' ||
                message === 'El monto debe ser mayor a cero' ||
                message === 'El monto debe ser un valor numérico') {
                return reply.status(400).send({ error: message });
            }
            return reply.status(500).send({ error: 'Error interno, reintente más tarde' });
        }
    }
}
