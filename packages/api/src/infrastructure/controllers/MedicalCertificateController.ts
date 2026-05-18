import { FastifyRequest, FastifyReply } from 'fastify';
import { CreateMedicalCertificateUseCase } from '../../application/useCases/CreateMedicalCertificateUseCase.js';
import { GetMedicalCertificateUseCase } from '../../application/useCases/GetMedicalCertificateUseCase.js';
import { GetMemberMedicalHistoryUseCase } from '../../application/useCases/GetMemberMedicalHistoryUseCase.js';
import { CreateMedicalCertificateRequest } from '@alentapp/shared';
import { MedicalCertificateMapper } from '../mappers/MedicalCertificateMapper.js';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class MedicalCertificateController {
    constructor(
        private readonly createMedicalCertificateUseCase: CreateMedicalCertificateUseCase,
        private readonly getMedicalCertificateUseCase: GetMedicalCertificateUseCase,
        private readonly getMemberMedicalHistoryUseCase: GetMemberMedicalHistoryUseCase,
    ) {}

    async create(
        request: FastifyRequest<{ Body: CreateMedicalCertificateRequest }>,
        reply: FastifyReply,
    ) {
        try {
            const cert = await this.createMedicalCertificateUseCase.execute(request.body);
            return reply.status(201).send({ data: MedicalCertificateMapper.toShared(cert) });
        } catch (error: any) {
            if (error.message === 'Socio no encontrado') {
                return reply.status(404).send({ error: error.message });
            }
            if (
                error.message === 'La fecha de fin debe ser posterior a la de inicio' ||
                error.message === 'Datos inválidos'
            ) {
                return reply.status(400).send({ error: error.message });
            }
            return reply.status(500).send({ error: 'Error interno, reintente más tarde' });
        }
    }

    async getById(
        request: FastifyRequest<{ Params: { id: string } }>,
        reply: FastifyReply,
    ) {
        const { id } = request.params;
        if (!UUID_REGEX.test(id)) {
            return reply.status(400).send({ error: 'El ID proporcionado no es un UUID válido' });
        }
        try {
            const cert = await this.getMedicalCertificateUseCase.execute(id);
            return reply.status(200).send({ data: MedicalCertificateMapper.toShared(cert) });
        } catch (error: any) {
            if (error.message === 'El recurso solicitado no existe') {
                return reply.status(404).send({ error: error.message });
            }
            return reply.status(500).send({ error: 'Error al recuperar los datos de la DB' });
        }
    }

    async getAllByMember(
        request: FastifyRequest<{ Querystring: { miembroId?: string; soloVigente?: string } }>,
        reply: FastifyReply,
    ) {
        const { miembroId, soloVigente } = request.query;
        if (!miembroId || !UUID_REGEX.test(miembroId)) {
            return reply.status(400).send({ error: 'El ID proporcionado no es un UUID válido' });
        }
        const filtrarVigente = soloVigente === 'true';
        try {
            const certs = await this.getMemberMedicalHistoryUseCase.execute(miembroId, filtrarVigente);
            if (certs.length === 0) {
                return reply.status(200).send({ error: 'No se encontraron certificados para este socio' });
            }
            return reply.status(200).send({ data: certs.map(MedicalCertificateMapper.toShared) });
        } catch {
            return reply.status(500).send({ error: 'Error al recuperar los datos de la DB' });
        }
    }
}
