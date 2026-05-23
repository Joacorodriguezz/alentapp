import { FastifyInstance } from 'fastify';

import { DisciplineController } from '../controllers/DisciplineController.js';

import { CreateDisciplineUseCase } from '../../application/useCases/CreateDisciplineUseCase.js';
import { UpdateDisciplineUseCase } from '../../application/useCases/UpdateDisciplineUseCase.js';
import { GetDisciplinesUseCase } from '../../application/useCases/GetDisciplinesUseCase.js';
import { GetDisciplineByIdUseCase } from '../../application/useCases/GetDisciplineByIdUseCase.js';
import { DeleteDisciplineUseCase } from '../../application/useCases/DeleteDisciplineUseCase.js';

import { DisciplineValidator } from '../../domain/services/DisciplineValidator.js';

import { PostgresDisciplineRepository } from '../repositories/PostgresDisciplineRepository.js';
import { PostgresMemberRepository } from '../repositories/PostgresMemberRepository.js';

export async function disciplineRouter(
    fastify: FastifyInstance,
) {
    const disciplineRepository =
        new PostgresDisciplineRepository();

    const disciplineValidator =
        new DisciplineValidator();

    const memberRepository = 
        new PostgresMemberRepository();

    const createDisciplineUseCase =
        new CreateDisciplineUseCase(
            disciplineRepository,
            disciplineValidator,
            memberRepository,
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

    const deleteDisciplineUseCase =
        new DeleteDisciplineUseCase(
            disciplineRepository,
            disciplineValidator,
        );

    const disciplineController =
        new DisciplineController(
            createDisciplineUseCase,
            updateDisciplineUseCase,
            getDisciplinesUseCase,
            getDisciplineByIdUseCase,
            deleteDisciplineUseCase,
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

    fastify.delete(
        '/api/v1/disciplines/:id',
        disciplineController.delete.bind(
            disciplineController,
        ),
    );

}