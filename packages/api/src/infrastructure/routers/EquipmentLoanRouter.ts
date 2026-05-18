import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { EquipmentLoanController } from '../controllers/EquipmentLoanController.js';
import { CreateEquipmentLoanUseCase } from '../../application/useCases/CreateEquipmentLoanUseCase.js';
import { UpdateEquipmentLoanUseCase } from '../../application/useCases/UpdateEquipmentLoanUseCase.js';
import { DeleteEquipmentLoanUseCase } from '../../application/useCases/DeleteEquipmentLoanUseCase.js';
import { GetAllEquipmentLoansUseCase } from '../../application/useCases/GetAllEquipmentLoansUseCase.js';
import { GetEquipmentLoanByIdUseCase } from '../../application/useCases/GetEquipmentLoanByIdUseCase.js';
import { PostgresEquipmentLoanRepository } from '../repositories/PostgresEquipmentLoanRepository.js';
import { PostgresMemberRepository } from '../repositories/PostgresMemberRepository.js';

export async function equipmentLoanRoutes(fastify: FastifyInstance) {
  const equipmentLoanRepo = new PostgresEquipmentLoanRepository();
  const memberRepo = new PostgresMemberRepository();

  const createUseCase = new CreateEquipmentLoanUseCase(equipmentLoanRepo, memberRepo);
  const updateUseCase = new UpdateEquipmentLoanUseCase(equipmentLoanRepo);
  const deleteUseCase = new DeleteEquipmentLoanUseCase(equipmentLoanRepo);
  const getAllUseCase = new GetAllEquipmentLoansUseCase(equipmentLoanRepo);
  const getByIdUseCase = new GetEquipmentLoanByIdUseCase(equipmentLoanRepo);
  const controller = new EquipmentLoanController(createUseCase, updateUseCase, deleteUseCase, getAllUseCase, getByIdUseCase);

  fastify.get('/api/v1/equipment-loans', (request: FastifyRequest, reply: FastifyReply) => controller.getAll(request, reply));
  fastify.get('/api/v1/equipment-loans/:id', (request: FastifyRequest, reply: FastifyReply) => controller.getById(request, reply));
  fastify.post('/api/v1/equipment-loans', (request: FastifyRequest, reply: FastifyReply) => controller.create(request, reply));
  fastify.patch('/api/v1/equipment-loans/:id', (request: FastifyRequest, reply: FastifyReply) => controller.update(request, reply));
  fastify.delete('/api/v1/equipment-loans/:id', (request: FastifyRequest, reply: FastifyReply) => controller.delete(request, reply));
}