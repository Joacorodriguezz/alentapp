import { EquipmentLoanDTOMapper } from '../mappers/EquipmentLoanDTOMapper.js';
export class EquipmentLoanController {
    createUseCase;
    updateUseCase;
    deleteUseCase;
    getAllUseCase;
    getByIdUseCase;
    constructor(createUseCase, updateUseCase, deleteUseCase, getAllUseCase, getByIdUseCase) {
        this.createUseCase = createUseCase;
        this.updateUseCase = updateUseCase;
        this.deleteUseCase = deleteUseCase;
        this.getAllUseCase = getAllUseCase;
        this.getByIdUseCase = getByIdUseCase;
    }
    async create(request, reply) {
        try {
            const body = request.body;
            if (!body.itemName || !body.dueDate || !body.memberId) {
                return reply.status(400).send({
                    error: 'Los campos itemName y dueDate son requeridos.'
                });
            }
            const loan = await this.createUseCase.execute(body);
            return reply.status(200).send({ data: EquipmentLoanDTOMapper.toDTO(loan) });
        }
        catch (error) {
            const message = error.message;
            if (message === 'Los socios categoría Cadete no tienen permitido solicitar material.') {
                return reply.status(403).send({ error: message });
            }
            if (message === 'La fecha de devolución debe ser posterior a la fecha actual.') {
                return reply.status(400).send({ error: message });
            }
            if (message === 'El socio solicitado no se encuentra registrado en el sistema.') {
                return reply.status(404).send({ error: message });
            }
            console.error(error);
            return reply.status(500).send({ error: 'Error interno del servidor, reintente más tarde.' });
        }
    }
    async update(request, reply) {
        try {
            const { id } = request.params;
            const body = request.body;
            if (!this.isUuid(id)) {
                return reply.status(400).send({ error: 'El parámetro ID de la URL no tiene un formato válido.' });
            }
            const loan = await this.updateUseCase.execute(id, body);
            return reply.status(200).send({ data: EquipmentLoanDTOMapper.toDTO(loan) });
        }
        catch (error) {
            const message = error.message;
            if (message === 'El préstamo que intenta actualizar no existe en el sistema.') {
                return reply.status(404).send({ error: message });
            }
            if (message === "No se puede cambiar el estado a 'Prestado' si el préstamo ya fue finalizado." ||
                message === 'No se pueden modificar datos (itemName, dueDate) de un préstamo ya cerrado.') {
                return reply.status(409).send({ error: message });
            }
            if (message === 'La nueva fecha de devolución debe ser posterior a la fecha actual.') {
                return reply.status(400).send({ error: message });
            }
            console.error(error);
            return reply.status(500).send({ error: 'Error interno del servidor, reintente más tarde.' });
        }
    }
    async delete(request, reply) {
        try {
            const { id } = request.params;
            if (!this.isUuid(id)) {
                return reply.status(400).send({ error: 'El formato del ID provisto en la URL no es válido.' });
            }
            await this.deleteUseCase.execute(id);
            return reply.status(200).send({ data: { id } });
        }
        catch (error) {
            const message = error.message;
            if (message === 'El préstamo que intenta eliminar no se encuentra registrado.') {
                return reply.status(404).send({ error: message });
            }
            console.error(error);
            return reply.status(500).send({ error: 'Error interno del servidor, reintente más tarde.' });
        }
    }
    async getAll(request, reply) {
        try {
            const loans = await this.getAllUseCase.execute();
            return reply.status(200).send({ data: loans.map(loan => EquipmentLoanDTOMapper.toDTO(loan)) });
        }
        catch (error) {
            console.error(error);
            return reply.status(500).send({ error: 'Error interno del servidor, reintente más tarde.' });
        }
    }
    async getById(request, reply) {
        try {
            const { id } = request.params;
            if (!this.isUuid(id)) {
                return reply.status(400).send({ error: 'El formato del ID provisto en la URL no es válido.' });
            }
            const loan = await this.getByIdUseCase.execute(id);
            return reply.status(200).send({ data: EquipmentLoanDTOMapper.toDTO(loan) });
        }
        catch (error) {
            const message = error.message;
            if (message === 'El préstamo solicitado no fue encontrado.') {
                return reply.status(404).send({ error: message });
            }
            console.error(error);
            return reply.status(500).send({ error: 'Error interno del servidor, reintente más tarde.' });
        }
    }
    isUuid(id) {
        return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
    }
}
