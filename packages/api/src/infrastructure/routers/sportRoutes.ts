import { FastifyInstance } from 'fastify';
import { CreateSportUseCase } from '../../application/useCases/CreateSportUseCase.js';
import { UpdateSportUseCase } from '../../application/useCases/UpdateSportUseCase.js';
import { SportValidator } from '../../domain/services/SportValidator.js';
import { SportController } from '../controllers/SportController.js';
import { PostgresSportRepository } from '../repositories/PostgresSportRepository.js';

export async function sportRoutes(server: FastifyInstance) {
    const sportRepo = new PostgresSportRepository();
    const sportValidator = new SportValidator(sportRepo);
    const createSportUseCase = new CreateSportUseCase(sportRepo, sportValidator);
    const updateSportUseCase = new UpdateSportUseCase(sportRepo, sportValidator);
    const sportController = new SportController(createSportUseCase, updateSportUseCase);

    server.post('/api/v1/sports', sportController.create.bind(sportController));
    server.patch('/api/v1/sports/:id', sportController.update.bind(sportController));
}
