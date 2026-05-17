import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { EquipmentLoanController } from '../controllers/EquipmentLoanController.js';
import { CreateEquipmentLoanUseCase } from '../../application/useCases/CreateEquipmentLoanUseCase.js';
import { PostgresEquipmentLoanRepository } from '../repositories/PostgresEquipmentLoanRepository.js';
import { PostgresMemberRepository } from '../repositories/PostgresMemberRepository.js';

export async function equipmentLoanRoutes(fastify: FastifyInstance) {
  const equipmentLoanRepo = new PostgresEquipmentLoanRepository();
  const memberRepo = new PostgresMemberRepository();

  const createUseCase = new CreateEquipmentLoanUseCase(equipmentLoanRepo, memberRepo);
  const controller = new EquipmentLoanController(createUseCase);

  fastify.post('/api/v1/equipment-loans', (request: FastifyRequest, reply: FastifyReply) => controller.create(request, reply));
}