import { PostgresMemberRepository } from '../repositories/PostgresMemberRepository.js';
import { PostgresMedicalCertificateRepository } from '../repositories/PostgresMedicalCertificateRepository.js';
import { CreateMedicalCertificateUseCase } from '../../application/useCases/CreateMedicalCertificateUseCase.js';
import { GetMedicalCertificateUseCase } from '../../application/useCases/GetMedicalCertificateUseCase.js';
import { GetMemberMedicalHistoryUseCase } from '../../application/useCases/GetMemberMedicalHistoryUseCase.js';
import { UpdateMedicalCertificateUseCase } from '../../application/useCases/UpdateMedicalCertificateUseCase.js';
import { DeleteMedicalCertificateUseCase } from '../../application/useCases/DeleteMedicalCertificateUseCase.js';
import { MedicalCertificateController } from '../controllers/MedicalCertificateController.js';
export async function medicalCertificateRoutes(server) {
    const memberRepo = new PostgresMemberRepository();
    const certificateRepo = new PostgresMedicalCertificateRepository();
    const createCertificateUseCase = new CreateMedicalCertificateUseCase(certificateRepo, memberRepo);
    const getMedicalCertificateUseCase = new GetMedicalCertificateUseCase(certificateRepo, memberRepo);
    const getMemberMedicalHistoryUseCase = new GetMemberMedicalHistoryUseCase(certificateRepo, memberRepo);
    const updateMedicalCertificateUseCase = new UpdateMedicalCertificateUseCase(certificateRepo, memberRepo);
    const deleteMedicalCertificateUseCase = new DeleteMedicalCertificateUseCase(certificateRepo);
    const controller = new MedicalCertificateController(createCertificateUseCase, getMedicalCertificateUseCase, getMemberMedicalHistoryUseCase, updateMedicalCertificateUseCase, deleteMedicalCertificateUseCase);
    server.post('/api/v1/medical-certificates', controller.create.bind(controller));
    server.get('/api/v1/medical-certificates', controller.getAllByMember.bind(controller));
    server.get('/api/v1/medical-certificates/:id', controller.getById.bind(controller));
    server.put('/api/v1/medical-certificates/:id', controller.update.bind(controller));
    server.delete('/api/v1/medical-certificates/:id', controller.delete.bind(controller));
}
