import { FastifyRequest, FastifyReply } from 'fastify';
import { CreateMemberUseCase } from '../../application/useCases/NewMemberUseCase.js';
import { GetMembersUseCase } from '../../application/useCases/GetMembersUseCase.js';
import { UpdateMemberUseCase } from '../../application/useCases/UpdateMemberUseCase.js';
import { DeleteMemberUseCase } from '../../application/useCases/DeleteMemberUseCase.js';
import { CreateMemberRequest, UpdateMemberRequest } from '@alentapp/shared';
import { MemberMapper } from '../mappers/MemberMapper.js';

export class MemberController {
    constructor(
        private readonly createMemberUseCase: CreateMemberUseCase,
        private readonly getMembersUseCase: GetMembersUseCase,
        private readonly updateMemberUseCase: UpdateMemberUseCase,
        private readonly deleteMemberUseCase: DeleteMemberUseCase,
    ) {}

    async getAll(_request: FastifyRequest, reply: FastifyReply) {
        try {
            const socios = await this.getMembersUseCase.execute();
            return reply.status(200).send({ data: socios.map(MemberMapper.toDTO) });
        } catch (error: any) {
            return reply.status(500).send({ error: error.message });
        }
    }

    async create(
        request: FastifyRequest<{ Body: CreateMemberRequest }>,
        reply: FastifyReply,
    ) {
        try {
            request.log.info('Alguien pegó al endpoint de ping');
            const socio = await this.createMemberUseCase.execute(request.body);
            return reply.status(201).send({ data: MemberMapper.toDTO(socio) });
        } catch (error: any) {
            if (error.message.includes('Ya existe un miembro con ese DNI')) {
                return reply.status(409).send({ error: error.message });
            }
            if (error.message.includes('inválido')) {
                return reply.status(400).send({ error: error.message });
            }
            return reply.status(500).send({ error: "Error interno, reintente más tarde" });
        }
    }

    async update(
        request: FastifyRequest<{ Params: { id: string }; Body: UpdateMemberRequest }>,
        reply: FastifyReply,
    ) {
        try {
            const { id } = request.params;
            const socio = await this.updateMemberUseCase.execute(id, request.body);
            return reply.status(200).send({ data: MemberMapper.toDTO(socio) });
        } catch (error: any) {
            if (error.message.includes('Ya existe un miembro con ese DNI')) {
                return reply.status(409).send({ error: error.message });
            }
            if (error.message.includes('inválido') || error.message.includes('no existe')) {
                return reply.status(400).send({ error: error.message });
            }
            return reply.status(500).send({ error: "Error interno, reintente más tarde" });
        }
    }

    async delete(
        request: FastifyRequest<{ Params: { id: string } }>,
        reply: FastifyReply,
    ) {
        try {
            const { id } = request.params;
            await this.deleteMemberUseCase.execute(id);
            return reply.status(204).send();
        } catch (error: any) {
            return reply.status(400).send({ error: error.message });
        }
    }
}
