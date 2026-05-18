import { FastifyReply, FastifyRequest } from 'fastify';
import { CreateSportRequest, SportFilters, UpdateSportRequest } from '@alentapp/shared';
import { CreateSportUseCase } from '../../application/useCases/CreateSportUseCase.js';
import { GetAllSportsUseCase } from '../../application/useCases/GetAllSportsUseCase.js';
import { GetSportByIdUseCase } from '../../application/useCases/GetSportByIdUseCase.js';
import { UpdateSportUseCase } from '../../application/useCases/UpdateSportUseCase.js';
import { DeleteSportUseCase } from '../../application/useCases/DeleteSportUseCase.js';
import { SportMapper } from '../mappers/SportMapper.js';

export class SportController {
    constructor(
        private readonly createSportUseCase: CreateSportUseCase,
        private readonly getAllSportsUseCase: GetAllSportsUseCase,
        private readonly getSportByIdUseCase: GetSportByIdUseCase,
        private readonly updateSportUseCase: UpdateSportUseCase,
        private readonly deleteSportUseCase: DeleteSportUseCase,
    ) {}

    async getAll(
        request: FastifyRequest<{ Querystring: { requiresMedicalCertificate?: string } }>,
        reply: FastifyReply,
    ) {
        try {
            const filters = this.buildFilters(request.query);
            const sports = await this.getAllSportsUseCase.execute(filters);
            return reply.status(200).send({ data: sports.map(SportMapper.toDTO) });
        } catch (error: any) {
            return reply.status(400).send({ error: error.message });
        }
    }

    async getById(
        request: FastifyRequest<{ Params: { id: string } }>,
        reply: FastifyReply,
    ) {
        try {
            if (!this.isUuid(request.params.id)) {
                return reply.status(400).send({ error: 'Identificador de deporte inválido' });
            }

            const sport = await this.getSportByIdUseCase.execute(request.params.id);
            return reply.status(200).send({ data: SportMapper.toDTO(sport) });
        } catch (error: any) {
            if (error.message === 'Deporte no encontrado') {
                return reply.status(404).send({ error: error.message });
            }

            return reply.status(500).send({ error: 'Error interno, reintente más tarde' });
        }
    }

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

    async update(
        request: FastifyRequest<{ Params: { id: string }; Body: UpdateSportRequest }>,
        reply: FastifyReply,
    ) {
        try {
            const sport = await this.updateSportUseCase.execute(request.params.id, request.body);
            return reply.status(200).send({ data: SportMapper.toDTO(sport) });
        } catch (error: any) {
            if (error.message === 'Deporte no encontrado') {
                return reply.status(404).send({ error: error.message });
            }

            if (
                error.message === 'El nombre del deporte no puede modificarse' ||
                error.message === 'La capacidad máxima es obligatoria' ||
                error.message === 'La capacidad máxima debe ser mayor a cero' ||
                error.message === 'La capacidad máxima debe ser un numero entero' ||
                error.message === 'El precio adicional debe ser mayor o igual a cero' ||
                error.message === 'Se requiere al menos un campo para actualizar'
            ) {
                return reply.status(400).send({ error: error.message });
            }

            return reply.status(500).send({ error: 'Error interno, reintente más tarde' });
        }
    }

    async delete(
        request: FastifyRequest<{ Params: { id: string } }>,
        reply: FastifyReply,
    ) {
        try {
            if (!this.isUuid(request.params.id)) {
                return reply.status(400).send({ error: 'Identificador de deporte inválido' });
            }

            await this.deleteSportUseCase.execute(request.params.id);
            return reply.status(204).send();
        } catch (error: any) {
            if (error.message === 'Deporte no encontrado') {
                return reply.status(404).send({ error: error.message });
            }

            return reply.status(500).send({ error: 'Error interno, reintente más tarde' });
        }
    }

    private buildFilters(query: { requiresMedicalCertificate?: string }): SportFilters {
        if (query.requiresMedicalCertificate === undefined) {
            return {};
        }

        if (query.requiresMedicalCertificate === 'true') {
            return { requiresMedicalCertificate: true };
        }

        if (query.requiresMedicalCertificate === 'false') {
            return { requiresMedicalCertificate: false };
        }

        throw new Error('Filtro de certificado médico inválido');
    }

    private isUuid(id: string): boolean {
        return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
    }
}
}
