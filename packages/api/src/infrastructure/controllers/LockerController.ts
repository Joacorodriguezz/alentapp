import { FastifyReply, FastifyRequest } from 'fastify';
import type { CreateLockerRequest, UpdateLockerRequest } from '@alentapp/shared';
import { CreateLockerUseCase } from '../../application/useCases/CreateLockerUseCase.js';
import { GetLockerByIdUseCase } from '../../application/useCases/GetLockerByIdUseCase.js';
import { GetLockersUseCase } from '../../application/useCases/GetLockersUseCase.js';
import { UpdateLockerUseCase } from '../../application/useCases/UpdateLockerUseCase.js';
import { LockerDTOMapper } from '../mappers/LockerDTOMapper.js';

export class LockerController {
    constructor(
        private readonly createLockerUseCase: CreateLockerUseCase,
        private readonly getLockersUseCase: GetLockersUseCase,
        private readonly getLockerByIdUseCase: GetLockerByIdUseCase,
        private readonly updateLockerUseCase: UpdateLockerUseCase,
    ) {}

    async getAll(_request: FastifyRequest, reply: FastifyReply) {
        try {
            const lockers = await this.getLockersUseCase.execute();
            return reply.status(200).send({ data: lockers.map(LockerDTOMapper.ToDTO) });
        } catch {
            return reply.status(500).send({ error: 'Error interno, reintente más tarde' });
        }
    }

    async getById(
        request: FastifyRequest<{ Params: { id: string } }>,
        reply: FastifyReply,
    ) {
        try {
            const locker = await this.getLockerByIdUseCase.execute(request.params.id);
            return reply.status(200).send({ data: LockerDTOMapper.ToDTO(locker) });
        } catch (error: any) {
            if (error.message.includes('El id del locker')) {
                return reply.status(400).send({ error: error.message });
            }

            if (error.message === 'El locker no existe') {
                return reply.status(404).send({ error: error.message });
            }

            return reply.status(500).send({ error: 'Error interno, reintente más tarde' });
        }
    }

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

    async update(
        request: FastifyRequest<{ Params: { id: string }; Body: UpdateLockerRequest }>,
        reply: FastifyReply,
    ) {
        try {
            const locker = await this.updateLockerUseCase.execute(request.params.id, request.body);
            return reply.status(200).send({ data: LockerDTOMapper.ToDTO(locker) });
        } catch (error: any) {
            if (
                error.message === 'El locker solicitado no existe' ||
                error.message === 'El socio solicitado no existe'
            ) {
                return reply.status(404).send({ error: error.message });
            }

            if (
                error.message === 'Ya existe un locker con ese número' ||
                error.message === 'No se puede asignar un socio a un locker en mantenimiento' ||
                error.message === 'No se puede poner un locker en mantenimiento si tiene un miembro asociado'
            ) {
                return reply.status(409).send({ error: error.message });
            }

            if (
                error.message === 'El numero es obligatorio' ||
                error.message === 'El numero debe ser un entero positivo' ||
                error.message === 'La ubicación es obligatoria' ||
                error.message === 'Estado de locker inválido' ||
                error.message === 'Debe enviar al menos un campo a actualizar'
            ) {
                return reply.status(400).send({ error: error.message });
            }

            return reply.status(500).send({ error: 'Error interno, reintente más tarde' });
        }
    }
}
