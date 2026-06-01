import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { FastifyInstance } from 'fastify';
import { MedicalCertificate } from '../../domain/entities/MedicalCertificate.js';
import { CreateMedicalCertificateRequest, UpdateMedicalCertificateRequest } from '@alentapp/shared';

process.env.DATABASE_URL = 'postgres://dummy:dummy@localhost:5432/dummy';

// UUIDs válidos para pasar el regex del Controller
const VALID_CERT_UUID = '11111111-1111-1111-1111-111111111111';
const VALID_MEMBER_UUID = '22222222-2222-2222-2222-222222222222';
const NEW_CERT_UUID = '33333333-3333-3333-3333-333333333333';
const INVALID_CERT_UUID = '99999999-9999-9999-9999-999999999999';

// Misma ruta que medicalCertificateRoutes.ts (integración con repos mockeados, sin DB real)
vi.mock('../repositories/PostgresMemberRepository.js', () => {
    return {
        PostgresMemberRepository: class {
            async findByDni(dni: string) {
                return dni === '12345678' ? { id: VALID_MEMBER_UUID, dni: '12345678' } : null;
            }
            async findById(id: string) {
                return id === VALID_MEMBER_UUID ? { id: VALID_MEMBER_UUID, dni: '12345678' } : null;
            }
        }
    };
});

vi.mock('../repositories/PostgresMedicalCertificateRepository.js', () => {
    return {
        PostgresMedicalCertificateRepository: class {
            async save(data: any) {
                return new MedicalCertificate(
                    NEW_CERT_UUID,
                    data.issueDate,
                    data.expiryDate,
                    data.doctorLicence,
                    data.institution,
                    true,
                    data.memberId
                );
            }
            async invalidatePreviousCertificates(memberId: string) { return; }
            async findById(id: string) {
                return id === VALID_CERT_UUID ? new MedicalCertificate(
                    VALID_CERT_UUID, '2025-01-01', '2026-01-01', 'MP 12345', 'Hospital', true, VALID_MEMBER_UUID
                ) : null;
            }
            async findAllByMember(memberId: string) {
                return memberId === VALID_MEMBER_UUID ? [
                    new MedicalCertificate(VALID_CERT_UUID, '2025-01-01', '2026-01-01', 'MP 12345', 'Hospital', true, VALID_MEMBER_UUID)
                ] : [];
            }
            async findActiveByMember(memberId: string) {
                return memberId === VALID_MEMBER_UUID ? [
                    new MedicalCertificate(VALID_CERT_UUID, '2025-01-01', '2026-01-01', 'MP 12345', 'Hospital', true, VALID_MEMBER_UUID)
                ] : [];
            }
            async update(id: string, data: any) {
                return new MedicalCertificate(
                    id,
                    data.issueDate || '2025-01-01',
                    data.expiryDate || '2026-01-01',
                    data.doctorLicence || 'MP 12345',
                    data.institution || 'Hospital',
                    true,
                    VALID_MEMBER_UUID
                );
            }
            async logicalDelete(id: string) { return; }
        }
    };
});

const { buildApp } = await import('../../app.js');

describe('MedicalCertificate API Integration Tests', () => {
    let app: FastifyInstance;

    beforeAll(async () => {
        app = buildApp();
        await app.ready();
    });

    afterAll(async () => {
        await app.close();
    });

    describe('POST /api/v1/medical-certificates', () => {
        it('[IT-01] debe retornar 201 y crear el certificado cuando los datos son válidos', async () => {
            const payload: CreateMedicalCertificateRequest = {
                dni: '12345678', // Existente
                issueDate: '2025-01-01',
                expiryDate: '2026-01-01',
                doctorLicence: 'MP 999',
                institution: 'Clínica'
            };

            const response = await app.inject({
                method: 'POST',
                url: '/api/v1/medical-certificates',
                payload
            });

            expect(response.statusCode).toBe(201);
            const body = JSON.parse(response.payload);
            expect(body.data.id).toBe(NEW_CERT_UUID);
            expect(body.data.dni).toBe('12345678');
            expect(body.data.doctorLicence).toBe('MP 999');
        });

        it('[IT-02] debe retornar 404 cuando el DNI del socio no existe', async () => {
            const payload: CreateMedicalCertificateRequest = {
                dni: '99999999', // Inexistente
                issueDate: '2025-01-01',
                expiryDate: '2026-01-01',
                doctorLicence: 'MP 999',
                institution: 'Clínica'
            };

            const response = await app.inject({
                method: 'POST',
                url: '/api/v1/medical-certificates',
                payload
            });

            expect(response.statusCode).toBe(404);
            const body = JSON.parse(response.payload);
            expect(body.error).toBe('Socio no encontrado');
        });

        it('[IT-03] debe retornar 400 cuando las fechas son inválidas (vencimiento anterior a emisión)', async () => {
            const payload: CreateMedicalCertificateRequest = {
                dni: '12345678',
                issueDate: '2025-01-01',
                expiryDate: '2024-01-01', // Error
                doctorLicence: 'MP 999',
                institution: 'Clínica'
            };

            const response = await app.inject({
                method: 'POST',
                url: '/api/v1/medical-certificates',
                payload
            });

            expect(response.statusCode).toBe(400);
            const body = JSON.parse(response.payload);
            expect(body.error).toBe('La fecha de vencimiento no puede ser anterior a la de la emisión');
        });
    });

    describe('GET /api/v1/medical-certificates/:id', () => {
        it('[IT-04] debe retornar 200 y el certificado cuando el ID es válido y existe', async () => {
            const response = await app.inject({
                method: 'GET',
                url: `/api/v1/medical-certificates/${VALID_CERT_UUID}`
            });

            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.payload);
            expect(body.data.id).toBe(VALID_CERT_UUID);
            expect(body.data.dni).toBe('12345678');
        });

        it('[IT-05] debe retornar 404 si el UUID es válido pero el certificado no existe', async () => {
            const response = await app.inject({
                method: 'GET',
                url: `/api/v1/medical-certificates/${INVALID_CERT_UUID}` // UUID formato OK, pero no existe
            });

            expect(response.statusCode).toBe(404);
            const body = JSON.parse(response.payload);
            expect(body.error).toBe('El recurso solicitado no existe');
        });
    });

    describe('GET /api/v1/medical-certificates?dni=...', () => {
        it('[IT-06] debe retornar 200 y el historial cuando se busca por DNI válido', async () => {
            const response = await app.inject({
                method: 'GET',
                url: '/api/v1/medical-certificates?dni=12345678'
            });

            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.payload);
            expect(body.data).toBeInstanceOf(Array);
            expect(body.data[0].id).toBe(VALID_CERT_UUID);
        });
    });

    describe('PUT /api/v1/medical-certificates/:id', () => {
        it('[IT-07] debe retornar 200 y el certificado actualizado', async () => {
            const payload: UpdateMedicalCertificateRequest = {
                doctorLicence: 'MP ACTUALIZADA'
            };

            const response = await app.inject({
                method: 'PUT',
                url: `/api/v1/medical-certificates/${VALID_CERT_UUID}`,
                payload
            });

            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.payload);
            expect(body.data.id).toBe(VALID_CERT_UUID);
            expect(body.data.doctorLicence).toBe('MP ACTUALIZADA');
        });
    });

    describe('DELETE /api/v1/medical-certificates/:id', () => {
        it('[IT-08] debe retornar 204 tras un borrado lógico exitoso', async () => {
            const response = await app.inject({
                method: 'DELETE',
                url: `/api/v1/medical-certificates/${VALID_CERT_UUID}`
            });

            expect(response.statusCode).toBe(204);
            expect(response.payload).toBe('');
        });
    });
});
