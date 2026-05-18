import { FastifyRequest, FastifyReply } from 'fastify';
import { CreateEquipmentLoanRequest, UpdateEquipmentLoanRequest } from '@alentapp/shared';
import { CreateEquipmentLoanUseCase } from '../../application/useCases/CreateEquipmentLoanUseCase.js';
import { UpdateEquipmentLoanUseCase } from '../../application/useCases/UpdateEquipmentLoanUseCase.js';
import { DeleteEquipmentLoanUseCase } from '../../application/useCases/DeleteEquipmentLoanUseCase.js';
import { GetAllEquipmentLoansUseCase } from '../../application/useCases/GetAllEquipmentLoansUseCase.js';
import { GetEquipmentLoanByIdUseCase } from '../../application/useCases/GetEquipmentLoanByIdUseCase.js';
import { EquipmentLoanDTOMapper } from '../mappers/EquipmentLoanDTOMapper.js';

export class EquipmentLoanController {
  constructor(
    private readonly createUseCase: CreateEquipmentLoanUseCase,
    private readonly updateUseCase: UpdateEquipmentLoanUseCase,
    private readonly deleteUseCase: DeleteEquipmentLoanUseCase,
    private readonly getAllUseCase: GetAllEquipmentLoansUseCase,
    private readonly getByIdUseCase: GetEquipmentLoanByIdUseCase,
  ) {}

  async create(request: FastifyRequest, reply: FastifyReply) {
    try {
      const body = request.body as CreateEquipmentLoanRequest;

      if (!body.itemName || !body.dueDate || !body.memberId) {
        return reply.status(400).send({
          error: 'Los campos itemName y dueDate son requeridos.'
        });
      }

      const loan = await this.createUseCase.execute(body);
      return reply.status(200).send({ data: EquipmentLoanDTOMapper.toDTO(loan) });

    } catch (error: any) {
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

  async update(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = request.params as { id: string };
      const body = request.body as UpdateEquipmentLoanRequest;

      const loan = await this.updateUseCase.execute(id, body);
      return reply.status(200).send({ data: EquipmentLoanDTOMapper.toDTO(loan) });

    } catch (error: any) {
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

  async delete(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = request.params as { id: string };

      await this.deleteUseCase.execute(id);
      return reply.status(200).send({ data: { id } });

    } catch (error: any) {
      const message = error.message;

      if (message === 'El préstamo que intenta eliminar no se encuentra registrado.') {
        return reply.status(404).send({ error: message });
      }

      console.error(error);
      return reply.status(500).send({ error: 'Error interno del servidor, reintente más tarde.' });
    }
  }

  async getAll(request: FastifyRequest, reply: FastifyReply) {
    try {
      const loans = await this.getAllUseCase.execute();
      return reply.status(200).send({ data: loans.map(loan => EquipmentLoanDTOMapper.toDTO(loan)) });
    } catch (error) {
      console.error(error);
      return reply.status(500).send({ error: 'Error interno del servidor, reintente más tarde.' });
    }
  }

  async getById(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = request.params as { id: string };
      const loan = await this.getByIdUseCase.execute(id);
      return reply.status(200).send({ data: EquipmentLoanDTOMapper.toDTO(loan) });
    } catch (error: any) {
      const message = error.message;
      if (message === 'El préstamo solicitado no fue encontrado.') {
        return reply.status(404).send({ error: message });
      }
      console.error(error);
      return reply.status(500).send({ error: 'Error interno del servidor, reintente más tarde.' });
    }
  }
}