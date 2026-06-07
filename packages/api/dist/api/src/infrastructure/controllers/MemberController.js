import { MemberMapper } from '../mappers/MemberMapper.js';
export class MemberController {
    createMemberUseCase;
    getMembersUseCase;
    updateMemberUseCase;
    deleteMemberUseCase;
    constructor(createMemberUseCase, getMembersUseCase, updateMemberUseCase, deleteMemberUseCase) {
        this.createMemberUseCase = createMemberUseCase;
        this.getMembersUseCase = getMembersUseCase;
        this.updateMemberUseCase = updateMemberUseCase;
        this.deleteMemberUseCase = deleteMemberUseCase;
    }
    async getAll(_request, reply) {
        try {
            const socios = await this.getMembersUseCase.execute();
            return reply.status(200).send({ data: socios.map(MemberMapper.toDTO) });
        }
        catch (error) {
            return reply.status(500).send({ error: error.message });
        }
    }
    async create(request, reply) {
        try {
            request.log.info('Alguien pegó al endpoint de ping');
            const socio = await this.createMemberUseCase.execute(request.body);
            return reply.status(201).send({ data: MemberMapper.toDTO(socio) });
        }
        catch (error) {
            if (error.message.includes('Ya existe un miembro con ese DNI')) {
                return reply.status(409).send({ error: error.message });
            }
            if (error.message.includes('inválido')) {
                return reply.status(400).send({ error: error.message });
            }
            return reply.status(500).send({ error: "Error interno, reintente más tarde" });
        }
    }
    async update(request, reply) {
        try {
            const { id } = request.params;
            const socio = await this.updateMemberUseCase.execute(id, request.body);
            return reply.status(200).send({ data: MemberMapper.toDTO(socio) });
        }
        catch (error) {
            if (error.message.includes('Ya existe un miembro con ese DNI')) {
                return reply.status(409).send({ error: error.message });
            }
            if (error.message.includes('inválido') || error.message.includes('no existe')) {
                return reply.status(400).send({ error: error.message });
            }
            return reply.status(500).send({ error: "Error interno, reintente más tarde" });
        }
    }
    async delete(request, reply) {
        try {
            const { id } = request.params;
            await this.deleteMemberUseCase.execute(id);
            return reply.status(204).send();
        }
        catch (error) {
            return reply.status(400).send({ error: error.message });
        }
    }
}
