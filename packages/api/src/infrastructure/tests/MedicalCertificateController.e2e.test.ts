import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { FastifyInstance } from 'fastify';
import crypto from 'crypto';

process.env.DATABASE_URL = 'postgres://dummy:dummy@localhost:5432/dummy';

import { buildApp } from '../../app.js';
import { MedicalCertificate } from '../../domain/entities/MedicalCertificate.js';

// Estado en memoria para simular la base de datos en flujos E2E de la API
const membersInMemory: any = {
    'member-e2e': { id: 'member-e2e', dni: '99999999' }
};

const certificatesInMemory: any = {};

vi.mock('../repositories/PostgresMemberRepository.js', () => {
    return {
        PostgresMemberRepository: class {
            async findByDni(dni: string) {
                return Object.values(membersInMemory).find((m: any) => m.dni === dni) || null;
            }
            async findById(id: string) {
                return membersInMemory[id] || null;
            }
        }
    };
});

vi.mock('../repositories/PostgresMedicalCertificateRepository.js', () => {
    return {
        PostgresMedicalCertificateRepository: class {
            async save(data: any) {
                const id = crypto.randomUUID();
                const cert = new MedicalCertificate(
                    id,
                    data.issueDate,
                    data.expiryDate,
                    data.doctorLicence,
                    data.institution,
                    true,
                    data.memberId
                );
                certificatesInMemory[id] = cert;
                return cert;
            }
            async invalidatePreviousCertificates(memberId: string) {
                for (const key of Object.keys(certificatesInMemory)) {
                    if (certificatesInMemory[key].memberId === memberId) {
                        certificatesInMemory[key].isValidated = false;
                    }
                }
            }
            async findById(id: string) {
                return certificatesInMemory[id] || null;
            }
            async findAllByMember(memberId: string) {
                return Object.values(certificatesInMemory).filter((c: any) => c.memberId === memberId);
            }
            async findActiveByMember(memberId: string) {
                return Object.values(certificatesInMemory).filter((c: any) => c.memberId === memberId && c.isValidated);
            }
            async update(id: string, data: any) {
                const cert = certificatesInMemory[id];
                if (!cert) return null;
                
                certificatesInMemory[id] = new MedicalCertificate(
                    cert.id,
                    data.issueDate || cert.issueDate,
                    data.expiryDate || cert.expiryDate,
                    data.doctorLicence || cert.doctorLicence,
                    data.institution || cert.institution,
                    cert.isValidated,
                    cert.memberId
                );
                return certificatesInMemory[id];
            }
            async logicalDelete(id: string) {
                if (certificatesInMemory[id]) {
                    certificatesInMemory[id].isValidated = false;
                }
            }
        }
    };
});

describe('MedicalCertificate API E2E Flows', () => {
    let app: FastifyInstance;

    beforeAll(async () => {
        app = buildApp();
        await app.ready();
    });

    afterAll(async () => {
        await app.close();
    });

    it('[E2E-01] Flujo Completo: Registrar nuevo certificado e invalidar anteriores (TDD-0020 y TDD-0029)', async () => {
        // 1. Crear el primer certificado
        const res1 = await app.inject({
            method: 'POST',
            url: '/api/v1/medical-certificates',
            payload: {
                dni: '99999999',
                issueDate: '2025-01-01',
                expiryDate: '2026-01-01',
                doctorLicence: 'MP 111',
                institution: 'Hospital A'
            }
        });
        expect(res1.statusCode).toBe(201);
        const cert1 = JSON.parse(res1.payload).data;
        
        // 2. Crear un segundo certificado para el mismo socio
        const res2 = await app.inject({
            method: 'POST',
            url: '/api/v1/medical-certificates',
            payload: {
                dni: '99999999',
                issueDate: '2026-02-01',
                expiryDate: '2027-02-01',
                doctorLicence: 'MP 222',
                institution: 'Hospital B'
            }
        });
        expect(res2.statusCode).toBe(201);
        const cert2 = JSON.parse(res2.payload).data;

        // 3. Obtener el historial y verificar que el primero fue invalidado y el segundo está activo
        const res3 = await app.inject({
            method: 'GET',
            url: '/api/v1/medical-certificates?dni=99999999'
        });
        expect(res3.statusCode).toBe(200);
        const history = JSON.parse(res3.payload).data;
        
        // Buscamos ambos certificados en el historial
        const c1 = history.find((c: any) => c.id === cert1.id);
        const c2 = history.find((c: any) => c.id === cert2.id);
        
        expect(c1.isValidated).toBe(false); // El primero debió ser invalidado por TDD-0020
        expect(c2.isValidated).toBe(true);  // El segundo debe estar vigente
    });

    it('[E2E-02] Flujo Completo: Registrar, Actualizar y Leer (TDD-0021 y TDD-0029)', async () => {
        // 1. Crear certificado
        const resCreate = await app.inject({
            method: 'POST',
            url: '/api/v1/medical-certificates',
            payload: {
                dni: '99999999',
                issueDate: '2027-01-01',
                expiryDate: '2028-01-01',
                doctorLicence: 'MP ERROR',
                institution: 'Hospital C'
            }
        });
        expect(resCreate.statusCode).toBe(201);
        const created = JSON.parse(resCreate.payload).data;

        // 2. Actualizar certificado (ej. corrigiendo matrícula)
        const resUpdate = await app.inject({
            method: 'PUT',
            url: `/api/v1/medical-certificates/${created.id}`,
            payload: {
                doctorLicence: 'MP CORRECTA'
            }
        });
        expect(resUpdate.statusCode).toBe(200);

        // 3. Leer certificado actualizado
        const resRead = await app.inject({
            method: 'GET',
            url: `/api/v1/medical-certificates/${created.id}`
        });
        expect(resRead.statusCode).toBe(200);
        const readData = JSON.parse(resRead.payload).data;
        
        expect(readData.doctorLicence).toBe('MP CORRECTA'); // Se actualizó
        expect(readData.institution).toBe('Hospital C');    // El resto se mantiene
    });

    it('[E2E-03] Flujo Completo: Registrar, Anular y Consultar (TDD-0028 y TDD-0029)', async () => {
        // 1. Crear certificado
        const resCreate = await app.inject({
            method: 'POST',
            url: '/api/v1/medical-certificates',
            payload: {
                dni: '99999999',
                issueDate: '2028-01-01',
                expiryDate: '2029-01-01',
                doctorLicence: 'MP 333',
                institution: 'Clínica D'
            }
        });
        expect(resCreate.statusCode).toBe(201);
        const created = JSON.parse(resCreate.payload).data;
        expect(created.isValidated).toBe(true);

        // 2. Anular certificado (borrado lógico)
        const resDelete = await app.inject({
            method: 'DELETE',
            url: `/api/v1/medical-certificates/${created.id}`
        });
        expect(resDelete.statusCode).toBe(204);

        // 3. Consultar y confirmar que ahora es inválido
        const resRead = await app.inject({
            method: 'GET',
            url: `/api/v1/medical-certificates/${created.id}`
        });
        expect(resRead.statusCode).toBe(200);
        const readData = JSON.parse(resRead.payload).data;
        
        expect(readData.isValidated).toBe(false); // Cambió a false tras el DELETE
    });
});
