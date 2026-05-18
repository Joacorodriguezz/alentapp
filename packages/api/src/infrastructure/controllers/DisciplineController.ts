import { FastifyRequest, FastifyReply } from 'fastify';
import { CreateDisciplineUseCase } from '../../application/useCases/CreateDisciplineUseCase.js';
import { GetDisciplinesUseCase } from '../../application/useCases/GetDisciplinesUseCase.js';
import { GetDisciplineByIdUseCase } from '../../application/useCases/GetDisciplineByIdUseCase.js';
import { CreateDisciplineRequest, DisciplineFilters } from '@alentapp/shared';
import { DisciplineDTOMapper } from '../mappers/DisciplineDtomapper.js';

export class DisciplineController {
    constructor(
        private readonly createDisciplineUseCase: CreateDisciplineUseCase,
        private readonly getDisciplinesUseCase: GetDisciplinesUseCase,
        private readonly getDisciplineByIdUseCase: GetDisciplineByIdUseCase,
    ) {}

    async getAll(
        request: FastifyRequest<{ Querystring: { memberId?: string; onlyActive?: string } }>,
        reply: FastifyReply,
    ) {
        try {
            const filters: DisciplineFilters = {};

            if (request.query.memberId) {
                filters.memberId = request.query.memberId;
            }
            if (request.query.onlyActive === 'true') {
                filters.onlyActive = true;
            }

            const disciplines = await this.getDisciplinesUseCase.execute(
                Object.keys(filters).length > 0 ? filters : undefined,
            );

            return reply.status(200).send({
                data: DisciplineDTOMapper.toDomainArray(disciplines),
            });
        } catch {
            return reply.status(500).send({ error: 'Error interno, reintente más tarde' });
        }
    }

    async getById(
        request: FastifyRequest<{ Params: { id: string } }>,
        reply: FastifyReply,
    ) {
        try {
            const discipline = await this.getDisciplineByIdUseCase.execute(request.params.id);
            return reply.status(200).send({ data: DisciplineDTOMapper.toDTO(discipline) });
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : '';

            if (message.includes('no existe')) {
                return reply.status(404).send({ error: message });
            }

            return reply.status(500).send({ error: 'Error interno, reintente más tarde' });
        }
    }

    async create(
        request: FastifyRequest<{ Body: CreateDisciplineRequest }>,
        reply: FastifyReply,
    ) {
        try {
            const discipline = await this.createDisciplineUseCase.execute(request.body);
            return reply.status(201).send({ data: DisciplineDTOMapper.toDTO(discipline) });
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : '';

            if (message.includes('estrictamente posterior')) {
                return reply.status(400).send({ error: message });
            }
            if (message.includes('obligatorio') || message.includes('inválido')) {
                return reply.status(400).send({ error: message });
            }
            if (message.includes('no existe')) {
                return reply.status(404).send({ error: message });
            }
            return reply.status(500).send({ error: 'Error interno, reintente más tarde' });
        }
    }
}
