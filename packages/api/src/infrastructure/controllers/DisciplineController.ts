import { FastifyRequest, FastifyReply } from 'fastify';
import { CreateDisciplineUseCase } from '../../application/useCases/CreateDisciplineUseCase.js';
import { UpdateDisciplineUseCase } from '../../application/useCases/UpdateDisciplineUseCase.js';
import { CreateDisciplineRequest, UpdateDisciplineRequest } from '@alentapp/shared';
import { DisciplineDTOMapper } from '../mappers/DisciplineDtomapper.js';

export class DisciplineController {
    constructor(
        private readonly createDisciplineUseCase: CreateDisciplineUseCase,
        private readonly updateDisciplineUseCase: UpdateDisciplineUseCase,
    ) {}

    async create(
        request: FastifyRequest<{ Body: CreateDisciplineRequest }>,
        reply: FastifyReply,
    ) {
        try {
            const discipline = await this.createDisciplineUseCase.execute(request.body);
            return reply.status(201).send({ data: DisciplineDTOMapper.toDTO(discipline) });
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : '';

            if (message.includes('posterior a la de inicio') || message.includes('obligatorio')) {
                return reply.status(400).send({ error: message });
            }
            if (message.includes('inválido')) {
                return reply.status(400).send({ error: message });
            }
            if (message.includes('no existe')) {
                return reply.status(404).send({ error: message });
            }
            return reply.status(500).send({ error: 'Error interno, reintente más tarde' });
        }
    }

    async update(
        request: FastifyRequest<{ Params: { id: string }; Body: UpdateDisciplineRequest }>,
        reply: FastifyReply,
    ) {
        try {
            if ('memberId' in request.body) {
                return reply.status(400).send({ error: 'Formato de datos inválido' });
            }

            const discipline = await this.updateDisciplineUseCase.execute(
                request.params.id,
                request.body,
            );

            return reply.status(200).send({ data: DisciplineDTOMapper.toDTO(discipline) });
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : '';

            if (message.includes('no existe')) {
                return reply.status(404).send({ error: message });
            }
            if (
                message.includes('al menos un campo') ||
                message.includes('posterior a la de inicio') ||
                message.includes('desactivada') ||
                message.includes('obligatorio') ||
                message.includes('inválido')
            ) {
                return reply.status(400).send({ error: message });
            }
            return reply.status(500).send({ error: 'Error interno, reintente más tarde' });
        }
    }
}
