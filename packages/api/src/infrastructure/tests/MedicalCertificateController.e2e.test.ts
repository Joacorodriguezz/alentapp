import { config } from 'dotenv';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../generated/client/client.js';

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
config({ path: resolve(packageRoot, '.env') });

// Default: docker-compose.yml dev stack. Override via .env or DATABASE_URL env var.
if (!process.env.DATABASE_URL) {
    process.env.DATABASE_URL = 'postgresql://admin:password123@localhost:5432/alentapp_db';
}

const { buildApp } = await import('../../app.js');

describe('MedicalCertificate API E2E Flows', () => {
    let app: FastifyInstance;
    let prisma: PrismaClient;
    let fixtureMemberId: string;
    let fixtureMemberDni: string;

    const randomSuffix = Math.floor(Math.random() * 100000000).toString().padStart(8, '0');

    beforeAll(async () => {
        app = buildApp();
        await app.ready();

        prisma = new PrismaClient({
            adapter: new PrismaPg(process.env.DATABASE_URL as string),
        });
        await prisma.$connect();

        fixtureMemberDni = randomSuffix;
        const fixtureMember = await prisma.member.create({
            data: {
                dni: fixtureMemberDni,
                name: 'Socio Fixture Medical Cert E2E',
                email: `mede2e${randomSuffix}@test.com`,
                birthdate: new Date('2000-01-01'),
                category: 'Pleno',
            },
        });
        fixtureMemberId = fixtureMember.id;
    });

    afterAll(async () => {
        if (fixtureMemberId) {
            await prisma.medicalCertificate.deleteMany({
                where: { memberId: fixtureMemberId },
            });
            await prisma.member.delete({
                where: { id: fixtureMemberId },
            });
        }
        await prisma.$disconnect();
        await app.close();
    });

    it('[E2E-01] Flujo Completo: Registrar nuevo certificado e invalidar anteriores (TDD-0020 y TDD-0029)', async () => {
        // 1. Crear el primer certificado
        const res1 = await app.inject({
            method: 'POST',
            url: '/api/v1/medical-certificates',
            payload: {
                dni: fixtureMemberDni,
                issueDate: '2025-01-01T00:00:00.000Z',
                expiryDate: '2026-01-01T00:00:00.000Z',
                doctorLicence: 'MP 111',
                institution: 'Hospital A'
            }
        });
        expect(res1.statusCode).toBe(201);
        const cert1 = JSON.parse(res1.payload).data;
        
        // Verificamos en DB
        const dbCert1 = await prisma.medicalCertificate.findUnique({
            where: { id: cert1.id }
        });
        expect(dbCert1).not.toBeNull();
        expect(dbCert1?.isValidated).toBe(true);

        // 2. Crear un segundo certificado para el mismo socio
        const res2 = await app.inject({
            method: 'POST',
            url: '/api/v1/medical-certificates',
            payload: {
                dni: fixtureMemberDni,
                issueDate: '2026-02-01T00:00:00.000Z',
                expiryDate: '2027-02-01T00:00:00.000Z',
                doctorLicence: 'MP 222',
                institution: 'Hospital B'
            }
        });
        expect(res2.statusCode).toBe(201);
        const cert2 = JSON.parse(res2.payload).data;

        // 3. Obtener el historial y verificar que el primero fue invalidado y el segundo está activo
        const res3 = await app.inject({
            method: 'GET',
            url: `/api/v1/medical-certificates?dni=${fixtureMemberDni}`
        });
        expect(res3.statusCode).toBe(200);
        const history = JSON.parse(res3.payload).data;
        
        const c1 = history.find((c: any) => c.id === cert1.id);
        const c2 = history.find((c: any) => c.id === cert2.id);
        
        expect(c1.isValidated).toBe(false);
        expect(c2.isValidated).toBe(true);

        // Verificamos estado real en DB
        const dbCert1After = await prisma.medicalCertificate.findUnique({ where: { id: cert1.id } });
        const dbCert2After = await prisma.medicalCertificate.findUnique({ where: { id: cert2.id } });
        expect(dbCert1After?.isValidated).toBe(false);
        expect(dbCert2After?.isValidated).toBe(true);
    });

    it('[E2E-02] Flujo Completo: Registrar, Actualizar y Leer (TDD-0021 y TDD-0029)', async () => {
        // 1. Crear certificado
        const resCreate = await app.inject({
            method: 'POST',
            url: '/api/v1/medical-certificates',
            payload: {
                dni: fixtureMemberDni,
                issueDate: '2027-01-01T00:00:00.000Z',
                expiryDate: '2028-01-01T00:00:00.000Z',
                doctorLicence: 'MP ERROR',
                institution: 'Hospital C'
            }
        });
        expect(resCreate.statusCode).toBe(201);
        const created = JSON.parse(resCreate.payload).data;

        // 2. Actualizar certificado
        const resUpdate = await app.inject({
            method: 'PUT',
            url: `/api/v1/medical-certificates/${created.id}`,
            payload: {
                doctorLicence: 'MP CORRECTA'
            }
        });
        expect(resUpdate.statusCode).toBe(200);

        // 3. Leer certificado actualizado mediante la API
        const resRead = await app.inject({
            method: 'GET',
            url: `/api/v1/medical-certificates/${created.id}`
        });
        expect(resRead.statusCode).toBe(200);
        const readData = JSON.parse(resRead.payload).data;
        
        expect(readData.doctorLicence).toBe('MP CORRECTA');
        expect(readData.institution).toBe('Hospital C');

        // Verificamos estado real en DB
        const dbCert = await prisma.medicalCertificate.findUnique({ where: { id: created.id } });
        expect(dbCert?.doctorLicence).toBe('MP CORRECTA');
    });

    it('[E2E-03] Flujo Completo: Registrar, Anular y Consultar (TDD-0028 y TDD-0029)', async () => {
        // 1. Crear certificado
        const resCreate = await app.inject({
            method: 'POST',
            url: '/api/v1/medical-certificates',
            payload: {
                dni: fixtureMemberDni,
                issueDate: '2028-01-01T00:00:00.000Z',
                expiryDate: '2029-01-01T00:00:00.000Z',
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

        // 3. Consultar mediante la API y confirmar que ahora es inválido
        const resRead = await app.inject({
            method: 'GET',
            url: `/api/v1/medical-certificates/${created.id}`
        });
        expect(resRead.statusCode).toBe(200);
        const readData = JSON.parse(resRead.payload).data;
        
        expect(readData.isValidated).toBe(false);

        // Verificamos estado real en DB
        const dbCert = await prisma.medicalCertificate.findUnique({ where: { id: created.id } });
        expect(dbCert?.isValidated).toBe(false);
    });
});
