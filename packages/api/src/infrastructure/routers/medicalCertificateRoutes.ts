import { FastifyInstance } from 'fastify';
import { PostgresMemberRepository } from '../repositories/PostgresMemberRepository.js';
import { PostgresMedicalCertificateRepository } from '../repositories/PostgresMedicalCertificateRepository.js';
import { CreateMedicalCertificateUseCase } from '../../application/useCases/CreateMedicalCertificateUseCase.js';
import { MedicalCertificateController } from '../controllers/MedicalCertificateController.js';

export async function medicalCertificateRoutes(server: FastifyInstance) {
    const memberRepo = new PostgresMemberRepository();
    const certificateRepo = new PostgresMedicalCertificateRepository();
    const createCertificateUseCase = new CreateMedicalCertificateUseCase(certificateRepo, memberRepo);

    const controller = new MedicalCertificateController(createCertificateUseCase);

    server.post('/api/v1/medical-certificates', controller.create.bind(controller));
}
