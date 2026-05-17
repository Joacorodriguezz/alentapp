import { FastifyRequest, FastifyReply } from 'fastify';
import { CreateEquipmentLoanRequest } from '@alentapp/shared';
import { CreateEquipmentLoanUseCase } from '../../application/useCases/CreateEquipmentLoanUseCase.js';
import { EquipmentLoanDTOMapper } from '../mappers/EquipmentLoanDTOMapper.js';

export class EquipmentLoanController {
  constructor(private readonly createUseCase: CreateEquipmentLoanUseCase) {}

  async create(request: FastifyRequest, reply: FastifyReply) {
    try {
      const body = request.body as CreateEquipmentLoanRequest;

      // 1. Validación de campos obligatorios faltantes (Código 400)
      if (!body.itemName || !body.dueDate || !body.memberId) {
        return reply.status(400).send({ 
          error: 'Los campos itemName y dueDate son requeridos.' 
        });
      }

      // 2. Ejecutar Caso de Uso
      const loan = await this.createUseCase.execute(body);

      // 3. Mapear al DTO y responder con éxito (Código 200)
      const responseDTO = EquipmentLoanDTOMapper.toDTO(loan);
      return reply.status(200).send({ data: responseDTO });

    } catch (error: any) {
      const message = error.message;

      // Mapeo de errores de negocio a códigos HTTP exactos según el TDD
      if (message === 'Los socios categoría Cadete no tienen permitido solicitar material.') {
        return reply.status(403).send({ error: message });
      }
      
      if (message === 'La fecha de devolución debe ser posterior a la fecha actual.') {
        return reply.status(400).send({ error: message });
      }
      
      if (message === 'El socio solicitado no se encuentra registrado en el sistema.') {
        return reply.status(404).send({ error: message });
      }

      // Error no controlado (Código 500)
      console.error(error);
      return reply.status(500).send({ 
        error: 'Error interno del servidor, reintente más tarde.' 
      });
    }
  }
}