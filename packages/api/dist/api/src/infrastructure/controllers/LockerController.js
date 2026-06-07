import { LockerDTOMapper } from '../mappers/LockersDTOMapper.js';
export class LockerController {
    createLockerUseCase;
    getLockersUseCase;
    getLockerByIdUseCase;
    deleteLockerUseCase;
    updateLockerUseCase;
    constructor(createLockerUseCase, getLockersUseCase, getLockerByIdUseCase, deleteLockerUseCase, updateLockerUseCase) {
        this.createLockerUseCase = createLockerUseCase;
        this.getLockersUseCase = getLockersUseCase;
        this.getLockerByIdUseCase = getLockerByIdUseCase;
        this.deleteLockerUseCase = deleteLockerUseCase;
        this.updateLockerUseCase = updateLockerUseCase;
    }
    async getAll(_request, reply) {
        try {
            const lockers = await this.getLockersUseCase.execute();
            return reply.status(200).send({ data: lockers.map(LockerDTOMapper.ToDTO) });
        }
        catch {
            return reply.status(500).send({ error: 'Error interno, reintente más tarde' });
        }
    }
    async getById(request, reply) {
        try {
            this.validateId(request.params.id);
            const locker = await this.getLockerByIdUseCase.execute(request.params.id);
            return reply.status(200).send({ data: LockerDTOMapper.ToDTO(locker) });
        }
        catch (error) {
            if (error.message.includes('El id del locker')) {
                return reply.status(400).send({ error: error.message });
            }
            if (error.message === 'El locker no existe') {
                return reply.status(404).send({ error: error.message });
            }
            return reply.status(500).send({ error: 'Error interno, reintente más tarde' });
        }
    }
    async create(request, reply) {
        try {
            const locker = await this.createLockerUseCase.execute(request.body);
            return reply.status(200).send({ data: LockerDTOMapper.ToDTO(locker) });
        }
        catch (error) {
            if (error.message === 'Ya existe un locker con ese número') {
                return reply.status(409).send({ error: error.message });
            }
            if (error.message === 'La ubicación es obligatoria' ||
                error.message === 'El numero es obligatorio' ||
                error.message === 'El numero debe ser un entero positivo') {
                return reply.status(400).send({ error: error.message });
            }
            return reply.status(500).send({ error: 'Error interno, reintente más tarde' });
        }
    }
    async delete(request, reply) {
        try {
            this.validateId(request.params.id);
            const deletedLocker = await this.deleteLockerUseCase.execute(request.params.id);
            return reply.status(200).send({ data: deletedLocker });
        }
        catch (error) {
            if (error.message.includes('El id del locker')) {
                return reply.status(400).send({ error: error.message });
            }
            if (error.message === 'El locker no existe') {
                return reply.status(404).send({ error: error.message });
            }
            if (error.message === 'No se puede eliminar un locker asignado a un socio') {
                return reply.status(409).send({ error: error.message });
            }
            return reply.status(500).send({ error: 'Error interno, reintente más tarde' });
        }
    }
    async update(request, reply) {
        try {
            const locker = await this.updateLockerUseCase.execute(request.params.id, request.body);
            return reply.status(200).send({ data: LockerDTOMapper.ToDTO(locker) });
        }
        catch (error) {
            if (error.message === 'El locker solicitado no existe' ||
                error.message === 'El socio solicitado no existe') {
                return reply.status(404).send({ error: error.message });
            }
            if (error.message === 'Ya existe un locker con ese número' ||
                error.message === 'No se puede asignar un socio a un locker en mantenimiento' ||
                error.message === 'No se puede poner un locker en mantenimiento si tiene un miembro asociado') {
                return reply.status(409).send({ error: error.message });
            }
            if (error.message === 'El numero es obligatorio' ||
                error.message === 'El numero debe ser un entero positivo' ||
                error.message === 'La ubicación es obligatoria' ||
                error.message === 'Estado de locker inválido' ||
                error.message === 'Debe enviar al menos un campo a actualizar') {
                return reply.status(400).send({ error: error.message });
            }
            return reply.status(500).send({ error: 'Error interno, reintente más tarde' });
        }
    }
    validateId(id) {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(id)) {
            throw new Error('El id del locker es inválido');
        }
    }
}
