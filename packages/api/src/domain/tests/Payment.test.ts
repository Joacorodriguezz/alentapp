import { describe, it, expect } from 'vitest';
import { Payment } from '../entities/Payment.js';

function buildPayment(
    overrides?: Partial<Pick<Payment, 'status' | 'deletedAt' | 'amount'>>,
): Payment {
    return new Payment(
        'payment-1',
        overrides?.amount ?? 100,
        'Cuota mensual',
        overrides?.status ?? 'Pending',
        '2026-05-01',
        'member-1',
        overrides?.deletedAt ?? null,
        '2026-05-01T00:00:00.000Z',
        '2026-05-01T00:00:00.000Z',
    );
}

describe('Payment', () => {
    it('debe crear un pago con estado Pending y deletedAt null', () => {
        const payment = Payment.create(
            'payment-1',
            150,
            'Cuota mensual',
            '2026-05-01',
            'member-1',
        );

        expect(payment.status).toBe('Pending');
        expect(payment.deletedAt).toBeNull();
        expect(payment.amount).toBe(150);
    });

    it('debe lanzar error si amount es cero o negativo', () => {
        expect(() =>
            Payment.create('payment-1', 0, null, '2026-05-01', 'member-1'),
        ).toThrow('El monto debe ser mayor a cero');

        expect(() =>
            Payment.create('payment-1', -10, null, '2026-05-01', 'member-1'),
        ).toThrow('El monto debe ser mayor a cero');
    });

    it('debe lanzar error si amount no es un valor numérico', () => {
        expect(() =>
            Payment.create('payment-1', NaN, null, '2026-05-01', 'member-1'),
        ).toThrow('El monto debe ser un valor numérico');
    });

    it('debe lanzar error si paymentDate es inválida o ausente', () => {
        expect(() =>
            Payment.create('payment-1', 100, null, 'fecha-invalida', 'member-1'),
        ).toThrow('La fecha de pago es inválida o está ausente');
    });

    it('debe lanzar error si faltan datos requeridos', () => {
        expect(() =>
            Payment.create('payment-1', 100, null, '2026-05-01', ''),
        ).toThrow('Datos inválidos');
    });

    it('debe rechazar modificar amount cuando el pago no está Pending', () => {
        const payment = buildPayment({ status: 'Paid' });

        expect(() => payment.updateAmount(200)).toThrow(
            'El monto solo puede modificarse si el pago está pendiente',
        );
    });
});
