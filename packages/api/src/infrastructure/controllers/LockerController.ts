import { FastifyReply, FastifyRequest } from 'fastify';
import type { CreateLockerRequest } from '@alentapp/shared';
import { CreateLockerUseCase } from '../../application/useCases/CreateLockerUseCase.js';
import { LockerDTOMapper } from '../mappers/LockerDTOMapper.js';

export class LockerController {
    constructor(private readonly createLockerUseCase: CreateLockerUseCase) {}

    async create(
        request: FastifyRequest<{ Body: CreateLockerRequest }>,
        reply: FastifyReply,
    ) {
        try {
            const locker = await this.createLockerUseCase.execute(request.body);
            return reply.status(200).send({ data: LockerDTOMapper.ToDTO(locker) });
        } catch (error: any) {
            if (error.message === 'Ya existe un locker con ese número') {
                return reply.status(409).send({ error: error.message });
            }

            if (
                error.message === 'La ubicación es obligatoria' ||
                error.message === 'El numero es obligatorio' ||
                error.message === 'El numero debe ser un entero positivo'
            ) {
                return reply.status(400).send({ error: error.message });
            }

            return reply.status(500).send({ error: 'Error interno, reintente más tarde' });
        }
    }
}
