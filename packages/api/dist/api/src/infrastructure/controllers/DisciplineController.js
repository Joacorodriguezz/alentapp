import { DisciplineDTOMapper } from '../mappers/DisciplineDtomapper.js';
export class DisciplineController {
    createDisciplineUseCase;
    updateDisciplineUseCase;
    getDisciplinesUseCase;
    getDisciplineByIdUseCase;
    deleteDisciplineUseCase;
    constructor(createDisciplineUseCase, updateDisciplineUseCase, getDisciplinesUseCase, getDisciplineByIdUseCase, deleteDisciplineUseCase) {
        this.createDisciplineUseCase = createDisciplineUseCase;
        this.updateDisciplineUseCase = updateDisciplineUseCase;
        this.getDisciplinesUseCase = getDisciplinesUseCase;
        this.getDisciplineByIdUseCase = getDisciplineByIdUseCase;
        this.deleteDisciplineUseCase = deleteDisciplineUseCase;
    }
    async getAll(request, reply) {
        try {
            const filters = {};
            if (request.query.memberId) {
                filters.memberId = request.query.memberId;
            }
            if (request.query.onlyActive === 'true') {
                filters.onlyActive = true;
            }
            const disciplines = await this.getDisciplinesUseCase.execute(Object.keys(filters).length > 0 ? filters : undefined);
            return reply.status(200).send({
                data: DisciplineDTOMapper.toDomainArray(disciplines),
            });
        }
        catch {
            return reply.status(500).send({
                error: 'Error interno, reintente más tarde',
            });
        }
    }
    async getById(request, reply) {
        try {
            const discipline = await this.getDisciplineByIdUseCase.execute(request.params.id);
            return reply.status(200).send({
                data: DisciplineDTOMapper.toDTO(discipline),
            });
        }
        catch (error) {
            const message = error instanceof Error ? error.message : '';
            if (message.includes('no existe')) {
                return reply.status(404).send({ error: message });
            }
            return reply.status(500).send({
                error: 'Error interno, reintente más tarde',
            });
        }
    }
    async create(request, reply) {
        try {
            const discipline = await this.createDisciplineUseCase.execute(request.body);
            return reply.status(201).send({
                data: DisciplineDTOMapper.toDTO(discipline),
            });
        }
        catch (error) {
            const message = error instanceof Error ? error.message : '';
            if (message.includes('posterior') ||
                message.includes('obligatorio') ||
                message.includes('inválido')) {
                return reply.status(400).send({ error: message });
            }
            if (message.includes('no existe')) {
                return reply.status(404).send({ error: message });
            }
            return reply.status(500).send({
                error: 'Error interno, reintente más tarde',
            });
        }
    }
    async update(request, reply) {
        try {
            if ('memberId' in request.body) {
                return reply.status(400).send({
                    error: 'Formato de datos inválido',
                });
            }
            const discipline = await this.updateDisciplineUseCase.execute(request.params.id, request.body);
            return reply.status(200).send({
                data: DisciplineDTOMapper.toDTO(discipline),
            });
        }
        catch (error) {
            const message = error instanceof Error ? error.message : '';
            if (message.includes('no existe')) {
                return reply.status(404).send({ error: message });
            }
            if (message.includes('al menos un campo') ||
                message.includes('posterior a la de inicio') ||
                message.includes('desactivada') ||
                message.includes('obligatorio') ||
                message.includes('inválido')) {
                return reply.status(400).send({ error: message });
            }
            return reply.status(500).send({
                error: 'Error interno, reintente más tarde',
            });
        }
    }
    async delete(request, reply) {
        try {
            const response = await this.deleteDisciplineUseCase.execute(request.params.id);
            return reply.status(200).send({ data: response });
        }
        catch (error) {
            const message = error instanceof Error ? error.message : '';
            if (message.includes('no existe')) {
                return reply.status(404).send({ error: message });
            }
            if (message.includes('ya fue eliminada')) {
                return reply.status(409).send({ error: message });
            }
            return reply.status(500).send({
                error: 'Error interno, reintente más tarde',
            });
        }
    }
}
