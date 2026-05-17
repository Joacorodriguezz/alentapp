import { FastifyInstance } from 'fastify';
import { PostgresMedicalCertificateRepository } from '../repositories/PostgresMedicalCertificateRepository.js';
import { PostgresMemberRepository } from '../repositories/PostgresMemberRepository.js';
import { CreateMedicalCertificateUseCase } from '../../application/useCases/CreateMedicalCertificateUseCase.js';
import { GetMedicalCertificatesUseCase } from '../../application/useCases/GetMedicalCertificatesUseCase.js';
import { MedicalCertificateController } from '../controllers/MedicalCertificateController.js';

export async function medicalCertificateRoutes(server: FastifyInstance) {
    const certRepo = new PostgresMedicalCertificateRepository();
    const memberRepo = new PostgresMemberRepository();
    const createMedicalCertificateUseCase = new CreateMedicalCertificateUseCase(certRepo, memberRepo);
    const getMedicalCertificatesUseCase = new GetMedicalCertificatesUseCase(certRepo);

    const medicalCertificateController = new MedicalCertificateController(
        createMedicalCertificateUseCase,
        getMedicalCertificatesUseCase
    );

    server.post('/api/v1/medical-certificates', medicalCertificateController.create.bind(medicalCertificateController));
    server.get('/api/v1/medical-certificates', medicalCertificateController.getAll.bind(medicalCertificateController));
}
