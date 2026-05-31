import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

/**
 * Tests E2E Full-Stack para la vista de Pagos.
 * NO hay ningún mock de red. Playwright interactúa con:
 *   - El Frontend React en http://localhost:5174
 *   - La API Fastify real en http://localhost:3001
 *   - La base de datos PostgreSQL de test (alentapp_test_db)
 *
 * El global-setup se encarga de limpiar TODAS las tablas antes de correr la suite,
 * por lo que cada test empieza desde un estado conocido y limpio.
 *
 * Flujo de los tests (secuencial, comparten estado):
 *   P-01 → Crea un socio Pleno vía API + crea un pago desde la UI → verifica Pendiente
 *   P-02 → Confirma el pago creado (cambia estado a Pagado) → verifica el badge
 *   P-03 → Crea un segundo pago pendiente y lo cancela → verifica Cancelado
 */

const API_URL = 'http://localhost:3001';

const TEST_DNI = `E2E${Math.floor(Math.random() * 100000)}`;
const TEST_MEMBER_NAME = 'Socio E2E Pagos';
const TEST_DESCRIPTION = 'Cuota E2E';
const TEST_AMOUNT = '2000';
const PAYMENT_DATE = '2026-06-01';
const CANCEL_DESCRIPTION = 'Cuota E2E cancelación';
const CANCEL_AMOUNT = '500';

async function selectMemberInCreateForm(page: Page): Promise<void> {
  await page.getByPlaceholder('Seleccionar socio').click();
  await page.getByPlaceholder('Buscar por DNI o nombre').fill(TEST_DNI);
  await page.getByText(`${TEST_MEMBER_NAME} — DNI ${TEST_DNI}`).click();
}

test.describe('Payments Full-Stack E2E', () => {

  // ─────────────────────────────────────────────────────────────────────────
  // P-01: Crear un pago válido y verlo en la tabla con estado Pendiente
  // TDD-0024: flujo de alta completo (UI → API → DB)
  // ─────────────────────────────────────────────────────────────────────────
  test('P-01: debe crear un pago válido y mostrarlo en la tabla con estado Pendiente', async ({ page }) => {
    const memberResponse = await fetch(`${API_URL}/api/v1/socios`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: TEST_MEMBER_NAME,
        dni: TEST_DNI,
        email: `pagos${TEST_DNI}@e2e.com`,
        birthdate: '2000-01-01',
        category: 'Pleno',
      }),
    });
    expect(memberResponse.status).toBe(201);

    await page.goto('/payments');
    await expect(page.getByText('No se encontraron pagos.')).toBeVisible({ timeout: 10000 });

    await page.getByRole('button', { name: 'Registrar Pago' }).click();
    await expect(page.getByText('Registrar Nuevo Pago')).toBeVisible();

    await page.getByPlaceholder('Ej. 1500.00').fill(TEST_AMOUNT);
    await page.getByPlaceholder('Ej. Cuota mensual enero').fill(TEST_DESCRIPTION);
    await page.locator('input[type="date"]').fill(PAYMENT_DATE);
    await selectMemberInCreateForm(page);

    await page.getByRole('button', { name: 'Registrar Pago' }).last().click();

    await expect(page.getByText('Registrar Nuevo Pago')).toBeHidden({ timeout: 10000 });
    await expect(page.getByText(TEST_DESCRIPTION)).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('$2000.00')).toBeVisible();
    await expect(page.getByText('Pendiente')).toBeVisible();
  });

  // ─────────────────────────────────────────────────────────────────────────
  // P-02: Confirmar el pago creado cambiando su estado a Pagado
  // TDD-0026: flujo de actualización completo (UI → API → DB)
  // ─────────────────────────────────────────────────────────────────────────
  test('P-02: debe confirmar el pago y cambiar su estado a Pagado', async ({ page }) => {
    await page.goto('/payments');

    await expect(page.getByText(TEST_DESCRIPTION)).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Pendiente')).toBeVisible();

    await page.getByRole('button', { name: 'Editar pago' }).first().click();
    await expect(page.getByText('Editar Pago')).toBeVisible();

    await page.getByRole('combobox').click();
    await page.getByRole('option', { name: 'Pagado' }).click();

    await page.getByRole('button', { name: 'Guardar Cambios' }).click();

    await expect(page.getByRole('button', { name: 'Guardar Cambios' })).toBeHidden({ timeout: 10000 });
    await expect(page.getByText('Pagado')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Pendiente')).toBeHidden();
  });

  // ─────────────────────────────────────────────────────────────────────────
  // P-03: Crear un segundo pago pendiente y cancelarlo
  // TDD-0027: flujo de baja lógica completo (UI → API → DB)
  // ─────────────────────────────────────────────────────────────────────────
  test('P-03: debe cancelar un pago pendiente y mostrar su estado como Cancelado', async ({ page }) => {
    await page.goto('/payments');

    await expect(page.getByText(TEST_DESCRIPTION)).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Pagado')).toBeVisible();

    await page.getByRole('button', { name: 'Registrar Pago' }).click();
    await expect(page.getByText('Registrar Nuevo Pago')).toBeVisible();

    await page.getByPlaceholder('Ej. 1500.00').fill(CANCEL_AMOUNT);
    await page.getByPlaceholder('Ej. Cuota mensual enero').fill(CANCEL_DESCRIPTION);
    await page.locator('input[type="date"]').fill(PAYMENT_DATE);
    await selectMemberInCreateForm(page);

    await page.getByRole('button', { name: 'Registrar Pago' }).last().click();

    await expect(page.getByText('Registrar Nuevo Pago')).toBeHidden({ timeout: 10000 });
    await expect(page.getByText(CANCEL_DESCRIPTION)).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('$500.00')).toBeVisible();

    const cancelRow = page.getByRole('row').filter({ hasText: CANCEL_DESCRIPTION });
    await expect(cancelRow.getByText('Pendiente')).toBeVisible();

    page.on('dialog', (dialog) => dialog.accept());

    await cancelRow.getByRole('button', { name: 'Cancelar pago' }).click();

    await expect(cancelRow.getByText('Cancelado')).toBeVisible({ timeout: 10000 });
    await expect(cancelRow.getByText('Pendiente')).toBeHidden();
    await expect(page.getByText(TEST_DESCRIPTION)).toBeVisible();
    await expect(page.getByText('Pagado')).toBeVisible();
  });
});
