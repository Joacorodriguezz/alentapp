import { describe, it, expect } from 'vitest';
import { MedicalCertificate } from '../entities/MedicalCertificate.js';

// ============================================================
// TDD-0020 / TDD-0021 — Entidad de Dominio: MedicalCertificate
// Capa: Domain
// Cobertura: MedicalCertificate.validate(), validateDates(), parseDate()
// ============================================================

const BASE_VALID_DATA = {
    issueDate: '2025-01-01',
    expiryDate: '2026-01-01',
    doctorLicence: 'MP 12345',
    institution: 'Hospital San Martín',
    memberId: 'uuid-member-1',
};

describe('MedicalCertificate — Entidad de Dominio', () => {

    // ------------------------------------------------------------------
    // parseDate() — TDD-0020
    // ------------------------------------------------------------------
    describe('parseDate()', () => {
        it('[UT-01] debe parsear correctamente una fecha en formato ISO (YYYY-MM-DD)', () => {
            const result = MedicalCertificate.parseDate('2025-06-15');
            expect(result).toBeInstanceOf(Date);
            expect(isNaN(result.getTime())).toBe(false);
        });

        it('[UT-02] debe parsear correctamente una fecha en formato DD/MM/YYYY y mapear el año', () => {
            const result = MedicalCertificate.parseDate('15/06/2025');
            expect(result).toBeInstanceOf(Date);
            expect(isNaN(result.getTime())).toBe(false);
            expect(result.getUTCFullYear()).toBe(2025);
        });
    });

    // ------------------------------------------------------------------
    // validate() — TDD-0020: Registro de Nuevo Certificado Médico
    // Criterio: El sistema debe validar que la fecha de vencimiento sea
    // estrictamente posterior a la fecha de emisión.
    // ------------------------------------------------------------------
    describe('validate() — TDD-0020', () => {
        it('[UT-03] no debe lanzar error si todos los datos son válidos y las fechas son correctas', () => {
            expect(() => MedicalCertificate.validateDates(BASE_VALID_DATA.issueDate, BASE_VALID_DATA.expiryDate)).not.toThrow();
        });

        it('[UT-04] debe lanzar "Datos inválidos" si algún campo obligatorio es nulo o vacío', () => {
            const dataSinMatricula = { ...BASE_VALID_DATA, doctorLicence: '' };
            expect(() => MedicalCertificate.validate(dataSinMatricula))
                .toThrow('Datos inválidos');

            const dataSinInstitucion = { ...BASE_VALID_DATA, institution: '' };
            expect(() => MedicalCertificate.validate(dataSinInstitucion))
                .toThrow('Datos inválidos');

            const dataSinMiembro = { ...BASE_VALID_DATA, memberId: '' };
            expect(() => MedicalCertificate.validate(dataSinMiembro))
                .toThrow('Datos inválidos');
        });

        it('[UT-05] debe lanzar "La fecha de fin debe ser posterior a la de inicio" si expiryDate <= issueDate', () => {
            // Caso: expiryDate igual a issueDate
            const dataFechaIgual = { ...BASE_VALID_DATA, issueDate: '2025-06-01', expiryDate: '2025-06-01' };
            expect(() => MedicalCertificate.validateDates(dataFechaIgual.issueDate, dataFechaIgual.expiryDate))
                .toThrow('La fecha de fin debe ser posterior a la de inicio');

            // Caso: expiryDate anterior a issueDate
            const dataFechaAnterior = { ...BASE_VALID_DATA, issueDate: '2025-06-01', expiryDate: '2025-01-01' };
            expect(() => MedicalCertificate.validateDates(dataFechaAnterior.issueDate, dataFechaAnterior.expiryDate))
                .toThrow('La fecha de fin debe ser posterior a la de inicio');
        });
    });

    // ------------------------------------------------------------------
    // validateDates() — TDD-0021: Actualización de Certificado Médico
    // Criterio: Si se modifica la fecha de vencimiento, esta debe seguir
    // siendo posterior a la fecha de emisión. Mensaje semánticamente
    // distinto al de validate() para diferenciar el contexto de edición.
    // ------------------------------------------------------------------
    describe('validateDates() — TDD-0021', () => {
        it('[UT-06] no debe lanzar error si la expiryDate es posterior a la issueDate', () => {
            expect(() =>
                MedicalCertificate.validateDates('2025-01-01', '2026-01-01')
            ).not.toThrow();
        });

        it('[UT-07] debe lanzar "La fecha de fin debe ser posterior a la de inicio" si expiryDate <= issueDate', () => {
            // Caso: fechas iguales
            expect(() =>
                MedicalCertificate.validateDates('2025-06-01', '2025-06-01')
            ).toThrow('La fecha de fin debe ser posterior a la de inicio');

            // Caso: expiryDate anterior
            expect(() =>
                MedicalCertificate.validateDates('2025-06-01', '2025-01-01')
            ).toThrow('La fecha de fin debe ser posterior a la de inicio');
        });

        it('[UT-08] debe lanzar "Datos inválidos" si alguna de las fechas no se puede parsear', () => {
            expect(() =>
                MedicalCertificate.validateDates('no-es-fecha', '2026-01-01')
            ).toThrow('Datos inválidos');

            expect(() =>
                MedicalCertificate.validateDates('2025-01-01', '')
            ).toThrow('Datos inválidos');
        });
    });
});
