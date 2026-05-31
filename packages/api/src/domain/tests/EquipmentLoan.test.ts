import { describe, it, expect } from 'vitest';
import { EquipmentLoan } from '../entities/EquipmentLoan.js';
import { EquipmentLoanStatus } from '@alentapp/shared';

// Helper: genera una fecha futura sumando los ms indicados a partir de ahora
function futureDate(offsetMs: number): Date {
    return new Date(Date.now() + offsetMs);
}

const VALID_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
const VALID_MEMBER_ID = 'b1ffcd00-0d1c-5fg9-cc7e-7cc0ce491b22';
const VALID_ITEM = 'Pelota de Básquet Spalding';

describe('EquipmentLoan Entity', () => {

    // ─────────────────────────────────────────
    // Bloque 1: Factory Method create()
    // TDD-0016: Casos de borde de creación
    // ─────────────────────────────────────────
    describe('create (factory method)', () => {

        // U-01: Happy path — verifica las 3 invariantes de construcción de una vez
        it('U-01: debe crear un préstamo válido con status=Loaned y deletedAt=null', () => {
            // Given: datos válidos con fecha futura
            const dueDate = futureDate(24 * 60 * 60 * 1000); // +1 día

            // When: se invoca el factory method
            const loan = EquipmentLoan.create(VALID_ID, VALID_ITEM, dueDate, VALID_MEMBER_ID);

            // Then: las tres invariantes se cumplen
            expect(loan.id).toBe(VALID_ID);
            expect(loan.itemName).toBe(VALID_ITEM);
            expect(loan.status).toBe(EquipmentLoanStatus.Loaned);
            expect(loan.deletedAt).toBeNull();
            expect(loan.memberId).toBe(VALID_MEMBER_ID);
            expect(loan.loanDate).toBeInstanceOf(Date);
        });

        // U-02: Boundary — dueDate igual a ahora (valor exacto del límite, no es futuro)
        it('U-02: debe lanzar error si dueDate es exactamente igual a la fecha actual (límite inferior)', () => {
            // Given: una fecha que es prácticamente "ahora" (mismo instante que loanDate)
            // Usamos un Date fijo en el pasado reciente para garantizar que <= new Date()
            const now = new Date(Date.now() - 1);

            // When / Then
            expect(() =>
                EquipmentLoan.create(VALID_ID, VALID_ITEM, now, VALID_MEMBER_ID)
            ).toThrow('La fecha de devolución debe ser posterior a la fecha actual.');
        });

        // U-03: Boundary — dueDate 1ms en el pasado (justo por debajo del límite válido)
        it('U-03: debe lanzar error si dueDate está 1ms en el pasado', () => {
            // Given: fecha de devolución 1 milisegundo en el pasado
            const oneMillisecondAgo = new Date(Date.now() - 1);

            // When / Then
            expect(() =>
                EquipmentLoan.create(VALID_ID, VALID_ITEM, oneMillisecondAgo, VALID_MEMBER_ID)
            ).toThrow('La fecha de devolución debe ser posterior a la fecha actual.');
        });
    });

    // ─────────────────────────────────────────
    // Bloque 2: changeStatus()
    // TDD-0017: Transiciones de estado prohibidas
    // ─────────────────────────────────────────
    describe('changeStatus', () => {

        // U-04: Transición prohibida Returned → Loaned
        it('U-04: debe lanzar error al intentar regresar de Returned a Loaned', () => {
            // Given: un préstamo ya finalizado con estado Returned
            const loan = new EquipmentLoan(
                VALID_ID, VALID_ITEM, EquipmentLoanStatus.Returned,
                new Date(), futureDate(86400000), VALID_MEMBER_ID, null
            );

            // When / Then
            expect(() =>
                loan.changeStatus(EquipmentLoanStatus.Loaned)
            ).toThrow("No se puede cambiar el estado a 'Prestado' si el préstamo ya fue finalizado.");
        });

        // U-05: Transición prohibida Damaged → Loaned (variante alternativa del mismo bloqueo)
        it('U-05: debe lanzar error al intentar regresar de Damaged a Loaned', () => {
            // Given: un préstamo con estado Damaged
            const loan = new EquipmentLoan(
                VALID_ID, VALID_ITEM, EquipmentLoanStatus.Damaged,
                new Date(), futureDate(86400000), VALID_MEMBER_ID, null
            );

            // When / Then
            expect(() =>
                loan.changeStatus(EquipmentLoanStatus.Loaned)
            ).toThrow("No se puede cambiar el estado a 'Prestado' si el préstamo ya fue finalizado.");
        });
    });

    // ─────────────────────────────────────────
    // Bloque 3: updateInfo()
    // TDD-0017: Edición de histórico bloqueada
    // ─────────────────────────────────────────
    describe('updateInfo', () => {

        // U-06: Editar itemName en un préstamo Returned debe estar bloqueado
        it('U-06: debe lanzar error al intentar editar itemName en un préstamo con estado Returned', () => {
            // Given: un préstamo ya cerrado (Returned)
            const loan = new EquipmentLoan(
                VALID_ID, VALID_ITEM, EquipmentLoanStatus.Returned,
                new Date(), futureDate(86400000), VALID_MEMBER_ID, null
            );

            // When / Then
            expect(() =>
                loan.updateInfo('Otro ítem', undefined)
            ).toThrow('No se pueden modificar datos (itemName, dueDate) de un préstamo ya cerrado.');
        });
    });

    // ─────────────────────────────────────────
    // Bloque 4: delete()
    // TDD-0018: Baja lógica — ruta de error crítica
    // ─────────────────────────────────────────
    describe('delete', () => {

        // U-07: Doble eliminación lógica — la segunda llamada debe fallar
        it('U-07: debe lanzar error si se intenta eliminar un préstamo que ya fue dado de baja', () => {
            // Given: un préstamo que ya tiene deletedAt asignado (ya fue eliminado)
            const alreadyDeletedLoan = new EquipmentLoan(
                VALID_ID, VALID_ITEM, EquipmentLoanStatus.Loaned,
                new Date(), futureDate(86400000), VALID_MEMBER_ID,
                new Date() // deletedAt ya tiene valor
            );

            // When / Then
            expect(() =>
                alreadyDeletedLoan.delete()
            ).toThrow('El préstamo que intenta eliminar no se encuentra registrado.');
        });
    });
});
