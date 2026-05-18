import { FastifyInstance } from 'fastify';

import { DisciplineController } from '../controllers/DisciplineController.js';

import { CreateDisciplineUseCase } from '../../application/useCases/CreateDisciplineUseCase.js';
import { UpdateDisciplineUseCase } from '../../application/useCases/UpdateDisciplineUseCase.js';
import { GetDisciplinesUseCase } from '../../application/useCases/GetDisciplinesUseCase.js';
import { GetDisciplineByIdUseCase } from '../../application/useCases/GetDisciplineByIdUseCase.js';

import { DisciplineValidator } from '../../domain/services/DisciplineValidator.js';

import { PostgresDisciplineRepository } from '../repositories/PostgresDisciplineRepository.js';

export async function disciplineRouter(
    fastify: FastifyInstance,
) {
    const disciplineRepository =
        new PostgresDisciplineRepository();

    const disciplineValidator =
        new DisciplineValidator();

    const createDisciplineUseCase =
        new CreateDisciplineUseCase(
            disciplineRepository,
            disciplineValidator,
        );

    const updateDisciplineUseCase =
        new UpdateDisciplineUseCase(
            disciplineRepository,
            disciplineValidator,
        );

    const getDisciplinesUseCase =
        new GetDisciplinesUseCase(
            disciplineRepository,
        );

    const getDisciplineByIdUseCase =
        new GetDisciplineByIdUseCase(
            disciplineRepository,
        );

    const disciplineController =
        new DisciplineController(
            createDisciplineUseCase,
            updateDisciplineUseCase,
            getDisciplinesUseCase,
            getDisciplineByIdUseCase,
        );

    fastify.get(
        '/api/v1/disciplines',
        disciplineController.getAll.bind(
            disciplineController,
        ),
    );

    fastify.get(
        '/api/v1/disciplines/:id',
        disciplineController.getById.bind(
            disciplineController,
        ),
    );

    fastify.post(
        '/api/v1/disciplines',
        disciplineController.create.bind(
            disciplineController,
        ),
    );

    fastify.put(
        '/api/v1/disciplines/:id',
        disciplineController.update.bind(
            disciplineController,
        ),
    );
}