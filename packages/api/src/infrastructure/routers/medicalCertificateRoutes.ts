import { FastifyInstance } from 'fastify';
import { PostgresMemberRepository } from '../repositories/PostgresMemberRepository.js';
import { PostgresMedicalCertificateRepository } from '../repositories/PostgresMedicalCertificateRepository.js';
import { CreateMedicalCertificateUseCase } from '../../application/useCases/CreateMedicalCertificateUseCase.js';
import { GetMedicalCertificateUseCase } from '../../application/useCases/GetMedicalCertificateUseCase.js';
import { GetMemberMedicalHistoryUseCase } from '../../application/useCases/GetMemberMedicalHistoryUseCase.js';
import { UpdateMedicalCertificateUseCase } from '../../application/useCases/UpdateMedicalCertificateUseCase.js';
import { MedicalCertificateController } from '../controllers/MedicalCertificateController.js';

export async function medicalCertificateRoutes(server: FastifyInstance) {
    const memberRepo = new PostgresMemberRepository();
    const certificateRepo = new PostgresMedicalCertificateRepository();
    const createCertificateUseCase = new CreateMedicalCertificateUseCase(certificateRepo, memberRepo);
    const getMedicalCertificateUseCase = new GetMedicalCertificateUseCase(certificateRepo);
    const getMemberMedicalHistoryUseCase = new GetMemberMedicalHistoryUseCase(certificateRepo);
    const updateMedicalCertificateUseCase = new UpdateMedicalCertificateUseCase(certificateRepo);

    const controller = new MedicalCertificateController(
        createCertificateUseCase,
        getMedicalCertificateUseCase,
        getMemberMedicalHistoryUseCase,
        updateMedicalCertificateUseCase,
    );

    server.post('/api/v1/medical-certificates', controller.create.bind(controller));
    server.get('/api/v1/medical-certificates', controller.getAllByMember.bind(controller));
    server.get('/api/v1/medical-certificates/:id', controller.getById.bind(controller));
    server.put('/api/v1/medical-certificates/:id', controller.update.bind(controller));
}
