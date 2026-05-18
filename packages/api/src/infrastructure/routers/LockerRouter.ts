import { FastifyInstance } from 'fastify';
import { PostgresLockerRepository } from '../repositories/PostgresLockerRepository.js';
import { LockerValidator } from '../../domain/services/LockerValidator.js';
import { CreateLockerUseCase } from '../../application/useCases/CreateLockerUseCase.js';
import { GetLockerByIdUseCase } from '../../application/useCases/GetLockerByIdUseCase.js';
import { GetLockersUseCase } from '../../application/useCases/GetLockersUseCase.js';
import { LockerController } from '../controllers/LockerController.js';

export async function lockerRoutes(server: FastifyInstance) {
    const lockerRepo = new PostgresLockerRepository();
    const lockerValidator = new LockerValidator(lockerRepo);
    const createLockerUseCase = new CreateLockerUseCase(lockerRepo, lockerValidator);
    const getLockersUseCase = new GetLockersUseCase(lockerRepo);
    const getLockerByIdUseCase = new GetLockerByIdUseCase(lockerRepo);
    const lockerController = new LockerController(
        createLockerUseCase,
        getLockersUseCase,
        getLockerByIdUseCase,
    );

    server.get('/api/v1/lockers', lockerController.getAll.bind(lockerController));
    server.get('/api/v1/lockers/:id', lockerController.getById.bind(lockerController));
    server.post('/api/v1/lockers', lockerController.create.bind(lockerController));
}
