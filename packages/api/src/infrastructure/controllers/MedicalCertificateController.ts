import { FastifyRequest, FastifyReply } from 'fastify';
import { CreateMedicalCertificateUseCase } from '../../application/useCases/CreateMedicalCertificateUseCase.js';
import { CreateMedicalCertificateRequest } from '@alentapp/shared';
import { MedicalCertificateMapper } from '../mappers/MedicalCertificateMapper.js';

export class MedicalCertificateController {
    constructor(
        private readonly createMedicalCertificateUseCase: CreateMedicalCertificateUseCase,
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
}
