import { CreateSportUseCase } from '../../application/useCases/CreateSportUseCase.js';
import { GetAllSportsUseCase } from '../../application/useCases/GetAllSportsUseCase.js';
import { GetSportByIdUseCase } from '../../application/useCases/GetSportByIdUseCase.js';
import { UpdateSportUseCase } from '../../application/useCases/UpdateSportUseCase.js';
import { DeleteSportUseCase } from '../../application/useCases/DeleteSportUseCase.js';
import { SportValidator } from '../../domain/services/SportValidator.js';
import { SportController } from '../controllers/SportController.js';
import { PostgresSportRepository } from '../repositories/PostgresSportRepository.js';
import { SportDomainService } from '../../domain/services/SportDomainService.js';
import { PostgresEnrollmentRepository } from '../repositories/PostgresEnrollmentRepository.js';
export async function sportRoutes(server) {
    const sportRepo = new PostgresSportRepository();
    const sportValidator = new SportValidator(sportRepo);
    const createSportUseCase = new CreateSportUseCase(sportRepo, sportValidator);
    const getAllSportsUseCase = new GetAllSportsUseCase(sportRepo);
    const getSportByIdUseCase = new GetSportByIdUseCase(sportRepo);
    const updateSportUseCase = new UpdateSportUseCase(sportRepo);
    const enrollmentRepo = new PostgresEnrollmentRepository();
    const sportDomainService = new SportDomainService(enrollmentRepo);
    const deleteSportUseCase = new DeleteSportUseCase(sportRepo, sportDomainService);
    const sportController = new SportController(createSportUseCase, getAllSportsUseCase, getSportByIdUseCase, updateSportUseCase, deleteSportUseCase);
    server.get('/api/v1/sports', sportController.getAll.bind(sportController));
    server.get('/api/v1/sports/:id', sportController.getById.bind(sportController));
    server.post('/api/v1/sports', sportController.create.bind(sportController));
    server.patch('/api/v1/sports/:id', sportController.update.bind(sportController));
    server.delete('/api/v1/sports/:id', sportController.delete.bind(sportController));
}
