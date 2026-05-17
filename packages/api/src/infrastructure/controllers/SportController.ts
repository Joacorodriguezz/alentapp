import { FastifyReply, FastifyRequest } from 'fastify';
import { CreateSportRequest } from '@alentapp/shared';
import { CreateSportUseCase } from '../../application/useCases/CreateSportUseCase.js';
import { SportMapper } from '../mappers/SportMapper.js';

export class SportController {
    constructor(private readonly createSportUseCase: CreateSportUseCase) {}

    async create(
        request: FastifyRequest<{ Body: CreateSportRequest }>,
        reply: FastifyReply,
    ) {
        try {
            const sport = await this.createSportUseCase.execute(request.body);
            return reply.status(201).send({ data: SportMapper.toDTO(sport) });
        } catch (error: any) {
            if (error.message === 'El deporte ya existe') {
                return reply.status(409).send({ error: error.message });
            }

            if (
                error.message === 'El nombre del deporte es obligatorio' ||
                error.message === 'La capacidad máxima es obligatoria' ||
                error.message === 'La capacidad máxima debe ser un numero entero' ||
                error.message === 'La capacidad máxima debe ser mayor a cero' ||
                error.message === 'El precio adicional no puede ser negativo'
            ) {
                return reply.status(400).send({ error: error.message });
            }

            return reply.status(500).send({ error: 'Error interno, reintente más tarde' });
        }
    }
}
