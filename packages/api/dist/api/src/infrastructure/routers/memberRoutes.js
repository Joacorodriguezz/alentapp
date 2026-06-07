import { PostgresMemberRepository } from '../repositories/PostgresMemberRepository.js';
import { MemberValidator } from '../../domain/services/MemberValidator.js';
import { CreateMemberUseCase } from '../../application/useCases/NewMemberUseCase.js';
import { GetMembersUseCase } from '../../application/useCases/GetMembersUseCase.js';
import { UpdateMemberUseCase } from '../../application/useCases/UpdateMemberUseCase.js';
import { DeleteMemberUseCase } from '../../application/useCases/DeleteMemberUseCase.js';
import { MemberController } from '../controllers/MemberController.js';
export async function memberRoutes(server) {
    const memberRepo = new PostgresMemberRepository();
    const memberValidator = new MemberValidator(memberRepo);
    const createMemberUseCase = new CreateMemberUseCase(memberRepo, memberValidator);
    const getMembersUseCase = new GetMembersUseCase(memberRepo);
    const updateMemberUseCase = new UpdateMemberUseCase(memberRepo, memberValidator);
    const deleteMemberUseCase = new DeleteMemberUseCase(memberRepo);
    const memberController = new MemberController(createMemberUseCase, getMembersUseCase, updateMemberUseCase, deleteMemberUseCase);
    server.get('/api/v1/socios', memberController.getAll.bind(memberController));
    server.post('/api/v1/socios', memberController.create.bind(memberController));
    server.put('/api/v1/socios/:id', memberController.update.bind(memberController));
    server.delete('/api/v1/socios/:id', memberController.delete.bind(memberController));
}
