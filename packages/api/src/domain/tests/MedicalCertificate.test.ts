import { describe, it, expect } from 'vitest';
import { MedicalCertificate } from '../entities/MedicalCertificate.js';


const BASE_VALID_DATA = {
    issueDate: '2025-01-01',
    expiryDate: '2026-01-01',
    doctorLicence: 'MP 12345',
    institution: 'Hospital San Martín',
    memberId: 'uuid-member-1',
};

describe('MedicalCertificate — Entidad de Dominio', () => {

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

    describe('validateRequiredFields() y create()', () => {
        it('[UT-03] no debe lanzar error si todos los datos son válidos y las fechas son correctas', () => {
            expect(() => MedicalCertificate.create(BASE_VALID_DATA)).not.toThrow();
        });

        it('[UT-04] debe lanzar "Datos inválidos" si algún campo obligatorio es nulo o vacío', () => {
            const dataSinMatricula = { ...BASE_VALID_DATA, doctorLicence: '' };
            expect(() => MedicalCertificate.validateRequiredFields(dataSinMatricula))
                .toThrow('Datos inválidos');

            const dataSinInstitucion = { ...BASE_VALID_DATA, institution: '' };
            expect(() => MedicalCertificate.validateRequiredFields(dataSinInstitucion))
                .toThrow('Datos inválidos');

            const dataSinMiembro = { ...BASE_VALID_DATA, memberId: '' };
            expect(() => MedicalCertificate.validateRequiredFields(dataSinMiembro))
                .toThrow('Datos inválidos');
        });

        it('[UT-05] debe lanzar "La fecha de fin debe ser posterior a la de inicio" si expiryDate <= issueDate', () => {
            const dataFechaIgual = { ...BASE_VALID_DATA, issueDate: '2025-06-01', expiryDate: '2025-06-01' };
            expect(() => MedicalCertificate.create(dataFechaIgual))
                .toThrow('La fecha de fin debe ser posterior a la de inicio');

            const dataFechaAnterior = { ...BASE_VALID_DATA, issueDate: '2025-06-01', expiryDate: '2025-01-01' };
            expect(() => MedicalCertificate.create(dataFechaAnterior))
                .toThrow('La fecha de fin debe ser posterior a la de inicio');
        });
    });

    describe('validateDates()', () => {
        it('[UT-06] no debe lanzar error si la expiryDate es posterior a la issueDate', () => {
            expect(() =>
                MedicalCertificate.validateDates('2025-01-01', '2026-01-01')
            ).not.toThrow();
        });

        it('[UT-07] debe lanzar "La fecha de fin debe ser posterior a la de inicio" si expiryDate <= issueDate', () => {
            expect(() =>
                MedicalCertificate.validateDates('2025-06-01', '2025-06-01')
            ).toThrow('La fecha de fin debe ser posterior a la de inicio');

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
