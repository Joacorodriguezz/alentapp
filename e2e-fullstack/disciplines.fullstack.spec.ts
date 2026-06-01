import { test, expect } from '@playwright/test';

/**
 * Tests E2E Full-Stack para la vista de Disciplinas.
 * NO hay ningún mock de red. Playwright interactúa con:
 *   - El Frontend React en http://localhost:5174
 *   - La API Fastify real en http://localhost:3001
 *   - La base de datos PostgreSQL de test (alentapp_test_db)
 *
 * Flujo secuencial (workers: 1):
 *   D-01 → Estado vacío inicial
 *   D-02 → Crea un socio vía API + registra una disciplina desde la UI
 *   D-03 → Elimina la disciplina (baja lógica) → verifica badge "Eliminada"
 */

const API_URL = 'http://localhost:3001';

const TEST_DNI = `DISC${Math.floor(Math.random() * 100000)}`;
const TEST_REASON = 'Falta grave en partido E2E';
const TEST_MEMBER_NAME = 'Socio E2E Disciplinas';

test.describe('Disciplines Full-Stack E2E', () => {

  test('D-01: debe mostrar el estado vacío cuando no hay disciplinas en la DB', async ({ page }) => {
    await page.goto('/disciplines');
    await expect(page.getByText('No se encontraron disciplinas.')).toBeVisible({ timeout: 10000 });
  });

  test('D-02: debe crear una disciplina real para un miembro existente', async ({ page }) => {
    const memberResponse = await fetch(`${API_URL}/api/v1/socios`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: TEST_MEMBER_NAME,
        dni: TEST_DNI,
        email: `discipline${TEST_DNI}@e2e.com`,
        birthdate: '1990-03-20',
        category: 'Pleno',
      }),
    });
    expect(memberResponse.status).toBe(201);

    await page.goto('/disciplines');

    await page.getByRole('button', { name: 'Agregar Disciplina' }).click();
    await expect(page.getByText('Agregar Nueva Disciplina')).toBeVisible();

    await page.getByPlaceholder('Seleccione un miembro').click();
    await page.getByText(new RegExp(TEST_MEMBER_NAME)).click();

    await page.getByPlaceholder('Ej. Falta grave en partido').fill(TEST_REASON);
    await page.locator('input[type="datetime-local"]').nth(0).fill('2026-06-01T10:00');
    await page.locator('input[type="datetime-local"]').nth(1).fill('2026-06-15T10:00');

    await page.getByRole('button', { name: 'Crear Disciplina' }).click();

    await expect(page.getByRole('button', { name: 'Crear Disciplina' })).toBeHidden({ timeout: 10000 });
    await expect(page.getByText(TEST_REASON)).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(TEST_MEMBER_NAME)).toBeVisible();
    await expect(
      page.getByRole('row', { name: new RegExp(TEST_REASON) }).getByText('Activa', { exact: true })
    ).toBeVisible();
  });

  test('D-03: debe eliminar una disciplina y marcarla como Eliminada (baja lógica)', async ({ page }) => {
    await page.goto('/disciplines');

    await expect(page.getByText(TEST_REASON)).toBeVisible({ timeout: 10000 });
    await expect(
      page.getByRole('row', { name: new RegExp(TEST_REASON) }).getByText('Activa', { exact: true })
    ).toBeVisible();

    page.on('dialog', (dialog) => dialog.accept());

    await page
      .getByRole('row', { name: new RegExp(TEST_REASON) })
      .getByRole('button', { name: 'Eliminar disciplina' })
      .click();

    // La baja es lógica: la fila permanece pero el estado cambia a "Eliminada"
    await expect(page.getByText(TEST_REASON)).toBeVisible({ timeout: 10000 });
    await expect(
      page.getByRole('row', { name: new RegExp(TEST_REASON) }).getByText('Eliminada')
    ).toBeVisible({ timeout: 10000 });
    await expect(
      page.getByRole('row', { name: new RegExp(TEST_REASON) }).getByText('Activa', { exact: true })
    ).toBeHidden();

    // Con el filtro "Solo Activas" la disciplina eliminada no debe aparecer
    await page.getByRole('button', { name: 'Solo Activas' }).click();
    await page.getByRole('button', { name: 'Aplicar Filtros' }).click();
    await expect(page.getByText(TEST_REASON)).toBeHidden({ timeout: 10000 });
    await expect(page.getByText('No se encontraron disciplinas.')).toBeVisible();
  });
});
