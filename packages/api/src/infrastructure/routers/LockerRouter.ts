import { FastifyInstance } from 'fastify';
import { PostgresLockerRepository } from '../repositories/PostgresLockerRepository.js';
import { LockerValidator } from '../../domain/services/LockerValidator.js';
import { CreateLockerUseCase } from '../../application/useCases/CreateLockerUseCase.js';
import { LockerController } from '../controllers/LockerController.js';

export async function lockerRoutes(server: FastifyInstance) {
    const lockerRepo = new PostgresLockerRepository();
    const lockerValidator = new LockerValidator(lockerRepo);
    const createLockerUseCase = new CreateLockerUseCase(lockerRepo, lockerValidator);
    const lockerController = new LockerController(createLockerUseCase);

    server.post('/api/v1/lockers', lockerController.create.bind(lockerController));
}
