import { FastifyInstance } from 'fastify';
import { DisciplineController } from '../controllers/DisciplineController.js';
import { CreateDisciplineUseCase } from '../../application/useCases/CreateDisciplineUseCase.js';
import { UpdateDisciplineUseCase } from '../../application/useCases/UpdateDisciplineUseCase.js';
import { DisciplineValidator } from '../../domain/services/DisciplineValidator.js';
import { PostgresDisciplineRepository } from '../repositories/PostgresDisciplineRepository.js';

export async function disciplineRouter(fastify: FastifyInstance) {
    const disciplineRepository = new PostgresDisciplineRepository();
    const disciplineValidator = new DisciplineValidator();

    const createDisciplineUseCase = new CreateDisciplineUseCase(
        disciplineRepository,
        disciplineValidator,
    );
    const updateDisciplineUseCase = new UpdateDisciplineUseCase(
        disciplineRepository,
        disciplineValidator,
    );

    const disciplineController = new DisciplineController(
        createDisciplineUseCase,
        updateDisciplineUseCase,
    );

    fastify.post('/api/v1/disciplines', disciplineController.create.bind(disciplineController));
    fastify.put('/api/v1/disciplines/:id', disciplineController.update.bind(disciplineController));
}
