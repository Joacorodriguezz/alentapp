import { FastifyRequest, FastifyReply } from 'fastify';
import { CreateMedicalCertificateUseCase } from '../../application/useCases/CreateMedicalCertificateUseCase.js';
import { GetMedicalCertificateUseCase } from '../../application/useCases/GetMedicalCertificateUseCase.js';
import { GetMemberMedicalHistoryUseCase } from '../../application/useCases/GetMemberMedicalHistoryUseCase.js';
import { UpdateMedicalCertificateUseCase } from '../../application/useCases/UpdateMedicalCertificateUseCase.js';
import { DeleteMedicalCertificateUseCase } from '../../application/useCases/DeleteMedicalCertificateUseCase.js';
import { CreateMedicalCertificateRequest, UpdateMedicalCertificateRequest } from '@alentapp/shared';
import { MedicalCertificateMapper } from '../mappers/MedicalCertificateMapper.js';

// El UUID solo se usa internamente para los endpoints PUT / DELETE / GET :id
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// DNI: entre 7 y 8 dígitos numéricos
const DNI_REGEX = /^\d{7,8}$/;

export class MedicalCertificateController {
    constructor(
        private readonly createMedicalCertificateUseCase: CreateMedicalCertificateUseCase,
        private readonly getMedicalCertificateUseCase: GetMedicalCertificateUseCase,
        private readonly getMemberMedicalHistoryUseCase: GetMemberMedicalHistoryUseCase,
        private readonly updateMedicalCertificateUseCase: UpdateMedicalCertificateUseCase,
        private readonly deleteMedicalCertificateUseCase: DeleteMedicalCertificateUseCase,
    ) {}

    async create(
        request: FastifyRequest<{ Body: CreateMedicalCertificateRequest }>,
        reply: FastifyReply,
    ) {
        const { dni } = request.body;
        if (!dni || !DNI_REGEX.test(dni)) {
            return reply.status(400).send({ error: 'Datos inválidos' });
        }
        try {
            const { certificate, dni: resolvedDni } = await this.createMedicalCertificateUseCase.execute(request.body);
            return reply.status(201).send({ data: MedicalCertificateMapper.toShared(certificate, resolvedDni) });
        } catch (error: any) {
            if (error.message === 'Socio no encontrado') {
                return reply.status(404).send({ error: error.message });
            }
            if (
                error.message === 'La fecha de fin debe ser posterior a la de inicio' ||
                error.message === 'La fecha de vencimiento no puede ser anterior a la de la emisión' ||
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
            const { certificate, dni } = await this.getMedicalCertificateUseCase.execute(id);
            return reply.status(200).send({ data: MedicalCertificateMapper.toShared(certificate, dni) });
        } catch (error: any) {
            if (error.message === 'El recurso solicitado no existe') {
                return reply.status(404).send({ error: error.message });
            }
            return reply.status(500).send({ error: 'Error al recuperar los datos de la DB' });
        }
    }

    async getAllByMember(
        request: FastifyRequest<{ Querystring: { dni?: string; soloVigente?: string } }>,
        reply: FastifyReply,
    ) {
        const { dni, soloVigente } = request.query;
        if (!dni || !DNI_REGEX.test(dni)) {
            return reply.status(400).send({ error: 'Datos inválidos' });
        }
        const filtrarVigente = soloVigente === 'true';
        try {
            const { certs, dni: resolvedDni } = await this.getMemberMedicalHistoryUseCase.execute(dni, filtrarVigente);
            // Siempre devuelve { data }, incluso si el array está vacío.
            // El frontend es responsable de mostrar el mensaje "sin certificados".
            return reply.status(200).send({ data: certs.map(cert => MedicalCertificateMapper.toShared(cert, resolvedDni)) });
        } catch (error: any) {
            if (error.message === 'Socio no encontrado') {
                return reply.status(404).send({ error: error.message });
            }
            return reply.status(500).send({ error: 'Error al recuperar los datos de la DB' });
        }
    }

    async update(
        request: FastifyRequest<{ Params: { id: string }; Body: UpdateMedicalCertificateRequest & { memberId?: unknown } }>,
        reply: FastifyReply,
    ) {
        const { id } = request.params;
        if (!UUID_REGEX.test(id)) {
            return reply.status(400).send({ error: 'El ID proporcionado no es un UUID válido' });
        }
        if ('memberId' in request.body) {
            return reply.status(400).send({ error: 'Error de validación' });
        }
        try {
            const { certificate, dni } = await this.updateMedicalCertificateUseCase.execute(id, request.body);
            return reply.status(200).send({ data: MedicalCertificateMapper.toShared(certificate, dni) });
        } catch (error: any) {
            if (error.message === 'Certificado no encontrado') {
                return reply.status(404).send({ error: error.message });
            }
            if (error.message === 'La fecha de vencimiento no puede ser anterior a la de la emisión') {
                return reply.status(400).send({ error: error.message });
            }
            return reply.status(500).send({ error: 'Error interno, reintente más tarde' });
        }
    }

    async delete(
        request: FastifyRequest<{ Params: { id: string } }>,
        reply: FastifyReply,
    ) {
        const { id } = request.params;
        if (!UUID_REGEX.test(id)) {
            return reply.status(400).send({ error: 'El ID proporcionado no es un UUID válido' });
        }
        try {
            await this.deleteMedicalCertificateUseCase.execute(id);
            return reply.status(204).send();
        } catch (error: any) {
            if (error.message === 'Certificado no encontrado') {
                return reply.status(404).send({ error: error.message });
            }
            return reply.status(500).send({ error: 'Error al procesar la baja lógica' });
        }
    }
}
