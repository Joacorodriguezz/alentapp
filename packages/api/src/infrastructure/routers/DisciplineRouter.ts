import { FastifyInstance } from 'fastify';
import { DisciplineController } from '../controllers/DisciplineController.js';
import { CreateDisciplineUseCase } from '../../application/useCases/CreateDisciplineUseCase.js';
import { DisciplineValidator } from '../../domain/services/DisciplineValidator.js';
import { PostgresDisciplineRepository } from '../repositories/PostgresDisciplineRepository.js';

export async function disciplineRouter(fastify: FastifyInstance) {
    const disciplineRepository = new PostgresDisciplineRepository();
    const disciplineValidator = new DisciplineValidator();
    const createDisciplineUseCase = new CreateDisciplineUseCase(
        disciplineRepository,
        disciplineValidator,
    );

    const disciplineController = new DisciplineController(createDisciplineUseCase);

    fastify.post('/api/v1/disciplines', (request, reply) =>
        disciplineController.create(request, reply),
    );
}
