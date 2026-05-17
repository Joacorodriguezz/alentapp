import { FastifyRequest, FastifyReply } from 'fastify';
import { CreateDisciplineUseCase } from '../../application/useCases/CreateDisciplineUseCase.js';
import { CreateDisciplineRequest } from '@alentapp/shared';

export class DisciplineController {
    constructor(
        private readonly createDisciplineUseCase: CreateDisciplineUseCase,
    ) { }
    async create(
        request: FastifyRequest<{ Body: CreateDisciplineRequest }>,
        reply: FastifyReply,
    ) {
        try {
            const sancion = await this.createDisciplineUseCase.execute(request.body);
            return reply.status(201).send({ data: sancion });
        } catch (error: any) {
            if (error.message.includes('estrictamente posterior')) {
                return reply.status(400).send({ error: error.message });
            }
            if (error.message.includes('obligatorio') || error.message.includes('inválido')) {
                return reply.status(400).send({ error: error.message });
            }
            if (error.message.includes('no existe')) {
                return reply.status(404).send({ error: error.message });
            }
            return reply.status(500).send({ error: 'Error interno, reintente más tarde' });
        }
    }
}