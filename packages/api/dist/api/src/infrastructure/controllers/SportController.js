import { SportMapper } from '../mappers/SportMapper.js';
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function isCreateValidationError(message) {
    return (message.includes('obligatorio') ||
        message.includes('entero') ||
        message.includes('mayor a cero') ||
        message.includes('no puede ser negativo'));
}
function isUpdateValidationError(message) {
    return (message.includes('no puede modificarse') ||
        message.includes('obligatorio') ||
        message.includes('mayor a cero') ||
        message.includes('entero') ||
        message.includes('mayor o igual a cero') ||
        message.includes('al menos un campo'));
}
export class SportController {
    createSportUseCase;
    getAllSportsUseCase;
    getSportByIdUseCase;
    updateSportUseCase;
    deleteSportUseCase;
    constructor(createSportUseCase, getAllSportsUseCase, getSportByIdUseCase, updateSportUseCase, deleteSportUseCase) {
        this.createSportUseCase = createSportUseCase;
        this.getAllSportsUseCase = getAllSportsUseCase;
        this.getSportByIdUseCase = getSportByIdUseCase;
        this.updateSportUseCase = updateSportUseCase;
        this.deleteSportUseCase = deleteSportUseCase;
    }
    async getAll(request, reply) {
        try {
            const filters = {};
            if (request.query.requiresMedicalCertificate === 'true') {
                filters.requiresMedicalCertificate = true;
            }
            if (request.query.requiresMedicalCertificate === 'false') {
                filters.requiresMedicalCertificate = false;
            }
            const sports = await this.getAllSportsUseCase.execute(Object.keys(filters).length > 0 ? filters : undefined);
            return reply.status(200).send({ data: sports.map(SportMapper.toDTO) });
        }
        catch (error) {
            return reply.status(400).send({ error: error.message });
        }
    }
    async getById(request, reply) {
        try {
            if (!this.isUuid(request.params.id)) {
                return reply.status(400).send({ error: 'Identificador de deporte inválido' });
            }
            const sport = await this.getSportByIdUseCase.execute(request.params.id);
            return reply.status(200).send({ data: SportMapper.toDTO(sport) });
        }
        catch (error) {
            if (error.message === 'Deporte no encontrado') {
                return reply.status(404).send({ error: error.message });
            }
            return reply.status(500).send({ error: 'Error interno, reintente más tarde' });
        }
    }
    async create(request, reply) {
        try {
            const sport = await this.createSportUseCase.execute(request.body);
            return reply.status(201).send({ data: SportMapper.toDTO(sport) });
        }
        catch (error) {
            if (error.message === 'El deporte ya existe') {
                return reply.status(409).send({ error: error.message });
            }
            if (isCreateValidationError(error.message)) {
                return reply.status(400).send({ error: error.message });
            }
            return reply.status(500).send({ error: 'Error interno, reintente mas tarde' });
        }
    }
    async update(request, reply) {
        try {
            const sport = await this.updateSportUseCase.execute(request.params.id, request.body);
            return reply.status(200).send({ data: SportMapper.toDTO(sport) });
        }
        catch (error) {
            if (error.message === 'Deporte no encontrado') {
                return reply.status(404).send({ error: error.message });
            }
            if (isUpdateValidationError(error.message)) {
                return reply.status(400).send({ error: error.message });
            }
            return reply.status(500).send({ error: 'Error interno, reintente mas tarde' });
        }
    }
    async delete(request, reply) {
        try {
            if (!this.isUuid(request.params.id)) {
                return reply.status(400).send({ error: 'Identificador de deporte inválido' });
            }
            await this.deleteSportUseCase.execute(request.params.id);
            return reply.status(204).send();
        }
        catch (error) {
            if (error.message === 'Deporte no encontrado') {
                return reply.status(404).send({ error: error.message });
            }
            if (error.message === 'No se puede eliminar: existen inscripciones activas') {
                return reply.status(409).send({ error: error.message });
            }
            return reply.status(500).send({ error: 'Error interno, reintente más tarde' });
        }
    }
    buildFilters(query) {
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
    isUuid(id) {
        return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
    }
}
