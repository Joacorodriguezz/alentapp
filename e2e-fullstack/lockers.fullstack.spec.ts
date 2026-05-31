import { test, expect } from '@playwright/test';

/**
 * Tests E2E Full-Stack para la vista de Lockers.
 *
 * NO hay ningún mock de red. Playwright opera el sistema como un TODO integrado:
 *   - El Frontend React en http://localhost:5174
 *   - La API Fastify real en http://localhost:3001
 *   - La base de datos PostgreSQL de test (alentapp_test_db)
 *
 * Enfoque teórico (Sommerville / R. C. Martin / The DevOps Handbook):
 *   - Son PRUEBAS DE ESCENARIO: narrativas creíbles sobre cómo un operador del
 *     club usa el sistema, NO una prueba por método de producción. Así el equipo
 *     puede refactorizar la arquitectura interna sin romper esta suite.
 *   - Se respeta la PIRÁMIDE DE PRUEBAS: pocos E2E que cubren los flujos de
 *     negocio críticos; las combinaciones de datos viven en las unitarias.
 *   - Se cubren CAMINO FELIZ (crear, editar) y CAMINO TRISTE crítico de negocio
 *     (número de locker duplicado) para verificar que TODO el stack —del frontend
 *     a la base de datos— rechaza la operación inválida.
 *
 * El global-setup limpia la DB antes de la suite, por lo que el primer test parte
 * de un estado vacío conocido. Los tests corren SECUENCIALMENTE (workers: 1) y
 * encadenan una narrativa: se crea un locker, luego se edita, y por último se
 * intenta duplicarlo.
 */

const LOCKER_NUMBER = '7';
const LOCKER_LOCATION = 'Vestuario principal E2E';

test.describe('Lockers Full-Stack E2E', () => {

  test('camino feliz: debe crear un locker real y mostrarlo como Disponible en la tabla', async ({ page }) => {
    await page.goto('/lockers');

    // Estado inicial limpio garantizado por el global-setup
    await expect(page.getByText('No hay lockers cargados.')).toBeVisible({ timeout: 10000 });

    // Abrir el modal de creación (el botón del encabezado)
    await page.getByRole('button', { name: 'Agregar Locker' }).first().click();
    await expect(page.getByText('Agregar Nuevo Locker')).toBeVisible();

    // Llenar el formulario con datos reales
    await page.getByPlaceholder('Ej. 12').fill(LOCKER_NUMBER);
    await page.getByPlaceholder('Ej. Vestuario principal').fill(LOCKER_LOCATION);

    // Guardar
    await page.getByRole('button', { name: 'Crear Locker' }).click();

    // El modal se cierra y el locker aparece en la tabla real, con estado inicial Disponible
    await expect(page.getByRole('button', { name: 'Crear Locker' })).toBeHidden();
    await expect(page.getByRole('cell', { name: LOCKER_NUMBER, exact: true })).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(LOCKER_LOCATION)).toBeVisible();
    await expect(page.getByText('Disponible')).toBeVisible();
  });

  test('camino feliz: debe editar el locker y ponerlo En mantenimiento', async ({ page }) => {
    await page.goto('/lockers');

    // El locker del test anterior debe seguir en la tabla
    await expect(page.getByText(LOCKER_LOCATION)).toBeVisible({ timeout: 10000 });

    // Abrir el modal de edición
    await page.getByRole('button', { name: /Editar/i }).first().click();
    await expect(page.getByText('Editar Locker')).toBeVisible();

    // Cambiar el estado a "En mantenimiento" desde el select real
    await page.getByLabel('Estado').selectOption('Maintenance');

    // Guardar
    await page.getByRole('button', { name: 'Guardar Cambios' }).click();
    await expect(page.getByRole('button', { name: 'Guardar Cambios' })).toBeHidden();

    // El cambio se refleja en la tabla (recorrió API + DB)
    await expect(page.getByText('En mantenimiento')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Disponible')).toBeHidden();
  });

  test('camino triste: debe rechazar la creación de un locker con número duplicado', async ({ page }) => {
    await page.goto('/lockers');

    // El locker original (número 7) sigue existiendo tras los tests anteriores
    await expect(page.getByText(LOCKER_LOCATION)).toBeVisible({ timeout: 10000 });

    // Abrir el modal e intentar crear otro locker con el MISMO número
    await page.getByRole('button', { name: 'Agregar Locker' }).first().click();
    await expect(page.getByText('Agregar Nuevo Locker')).toBeVisible();

    await page.getByPlaceholder('Ej. 12').fill(LOCKER_NUMBER);
    await page.getByPlaceholder('Ej. Vestuario principal').fill('Ubicacion duplicada E2E');

    await page.getByRole('button', { name: 'Crear Locker' }).click();

    // El stack completo (frontend → API → DB) debe rechazar la operación y avisar
    await expect(page.getByText('Ya existe un locker con ese número')).toBeVisible({ timeout: 10000 });

    // No se debe haber creado la ubicación duplicada en la tabla
    await expect(page.getByText('Ubicacion duplicada E2E')).toBeHidden();
  });
});
