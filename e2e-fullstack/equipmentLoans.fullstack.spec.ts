import { test, expect } from '@playwright/test';

/**
 * Tests E2E Full-Stack para la vista de Préstamos de Equipamiento.
 * NO hay ningún mock de red. Playwright interactúa con:
 *   - El Frontend React en http://localhost:5174
 *   - La API Fastify real en http://localhost:3001
 *   - La base de datos PostgreSQL de test (alentapp_test_db)
 *
 * El global-setup se encarga de limpiar TODAS las tablas antes de correr la suite,
 * por lo que cada test empieza desde un estado conocido y limpio.
 *
 * Flujo de los tests (secuencial, comparten estado):
 *   E-01 → Crea un socio Pleno vía API + crea un préstamo desde la UI → verifica en tabla
 *   E-02 → Edita el préstamo creado (cambia estado a Devuelto) → verifica el badge
 *   E-03 → Elimina el préstamo → verifica que la tabla queda vacía
 */

const API_URL = 'http://localhost:3001';

// DNI único por ejecución para evitar colisiones con otras suites que puedan
// correr en el mismo entorno (mismo patrón que members.fullstack.spec.ts).
const TEST_DNI = `E2E${Math.floor(Math.random() * 100000)}`;
const TEST_ITEM_NAME = 'Pelota de Básquet E2E';

// Fecha de devolución futura en formato YYYY-MM-DD (requerido por <input type="date">)
const futureDateStr = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
  .toISOString()
  .split('T')[0];

test.describe('EquipmentLoans Full-Stack E2E', () => {

  // ─────────────────────────────────────────────────────────────────────────
  // E-01: Crear un préstamo válido para un socio Pleno y verlo en la tabla
  // TDD-0016: flujo de alta completo (UI → API → DB)
  // ─────────────────────────────────────────────────────────────────────────
  test('E-01: debe crear un préstamo válido para un socio Pleno y mostrarlo en la tabla', async ({ page }) => {
    // Given: existe un socio Pleno creado directamente vía API
    // (la DB fue limpiada por global-setup, así que empezamos desde cero)
    const memberResponse = await fetch(`${API_URL}/api/v1/socios`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Socio E2E Préstamos',
        dni: TEST_DNI,
        email: `prestamos${TEST_DNI}@e2e.com`,
        birthdate: '1990-05-15',
        category: 'Pleno',
      }),
    });
    expect(memberResponse.status).toBe(201);

    // When: el administrativo navega a la vista y registra un nuevo préstamo
    await page.goto('/equipment-loans');
    await expect(
      page.getByText('No se encontraron préstamos. Registra uno nuevo.')
    ).toBeVisible({ timeout: 10000 });

    // Abrir modal de creación
    await page.getByRole('button', { name: 'Registrar Préstamo' }).click();
    await expect(page.getByText('Registrar Nuevo Préstamo')).toBeVisible();

    // Completar formulario
    await page.getByPlaceholder('Ej. Pelota de Básquet Spalding').fill(TEST_ITEM_NAME);
    await page.locator('input[type="date"]').fill(futureDateStr);
    await page.getByPlaceholder('Ej. 40123456').fill(TEST_DNI);

    // Enviar
    await page.getByRole('button', { name: 'Registrar Préstamo' }).last().click();

    // Then: el modal se cierra y el préstamo aparece en la tabla
    await expect(page.getByText('Registrar Nuevo Préstamo')).toBeHidden({ timeout: 10000 });
    await expect(page.getByText(TEST_ITEM_NAME)).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Prestado')).toBeVisible();
  });

  // ─────────────────────────────────────────────────────────────────────────
  // E-02: Editar el préstamo creado y cambiar su estado a "Devuelto"
  // TDD-0017: flujo de actualización completo (UI → API → DB)
  // ─────────────────────────────────────────────────────────────────────────
  test('E-02: debe editar el préstamo y cambiar su estado a Devuelto', async ({ page }) => {
    await page.goto('/equipment-loans');

    // Given: el préstamo del test anterior está en la tabla con estado "Prestado"
    await expect(page.getByText(TEST_ITEM_NAME)).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Prestado')).toBeVisible();

    // When: el administrativo abre el modal de edición
    await page.getByRole('button', { name: 'Editar préstamo' }).first().click();
    await expect(page.getByText('Editar Préstamo')).toBeVisible();

    // Cambia el estado a "Devuelto" usando el selector de Chakra UI
    // El SelectTrigger de Chakra renderiza un botón con el valor actual,
    // hacemos click en él para abrir el dropdown y luego seleccionamos la opción.
    await page.getByRole('combobox').click();
    await page.getByRole('option', { name: 'Devuelto' }).click();

    // Guarda los cambios
    await page.getByRole('button', { name: 'Guardar Cambios' }).click();

    // Then: el modal se cierra y el badge de estado cambia en la tabla
    await expect(page.getByRole('button', { name: 'Guardar Cambios' })).toBeHidden({ timeout: 10000 });
    await expect(page.getByText('Devuelto')).toBeVisible({ timeout: 10000 });
    // El badge "Prestado" ya no debe aparecer
    await expect(page.getByText('Prestado')).toBeHidden();
  });

  // ─────────────────────────────────────────────────────────────────────────
  // E-03: Eliminar el préstamo y verificar que la tabla queda vacía
  // TDD-0018: flujo de baja lógica completo (UI → API → DB)
  // ─────────────────────────────────────────────────────────────────────────
  test('E-03: debe eliminar el préstamo y mostrar el estado vacío de la tabla', async ({ page }) => {
    await page.goto('/equipment-loans');

    // Given: el préstamo editado aún aparece en la tabla (con estado "Devuelto")
    await expect(page.getByText(TEST_ITEM_NAME)).toBeVisible({ timeout: 10000 });

    // El handler de eliminación usa window.confirm(); aceptamos automáticamente
    page.on('dialog', (dialog) => dialog.accept());

    // When: el administrativo hace clic en el botón de eliminar
    await page.getByRole('button', { name: 'Eliminar préstamo' }).first().click();

    // Then: la tabla muestra el estado vacío (baja lógica aplicada)
    await expect(
      page.getByText('No se encontraron préstamos. Registra uno nuevo.')
    ).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(TEST_ITEM_NAME)).toBeHidden();
  });
});
