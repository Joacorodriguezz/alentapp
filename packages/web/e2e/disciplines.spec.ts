import { test, expect } from '@playwright/test';

test.describe('Disciplines E2E (UI Integration)', () => {
  test.beforeEach(async ({ page }) => {
    page.on('console', (msg) => console.log('BROWSER CONSOLE:', msg.text()));

    const mockMembers = [
      {
        id: 'm1',
        dni: '12345678',
        name: 'Playwright Tester',
        email: 'test@playwright.dev',
        birthdate: '1990-01-01',
        category: 'Pleno',
        status: 'Activo',
        created_at: new Date().toISOString(),
      },
    ];

    const mockDb = [
      {
        id: '1',
        reason: 'Falta en partido',
        startDate: '2026-01-01',
        endDate: '2026-02-01',
        isTotalSuspension: true,
        memberId: 'm1',
        deletedAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    await page.route(/\/api\/v1\/socios/, async (route) => {
      const method = route.request().method();

      if (method === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ data: mockMembers }),
        });
      } else if (method === 'OPTIONS') {
        await route.fulfill({
          status: 200,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          },
        });
      } else {
        await route.continue();
      }
    });

    await page.route(/\/api\/v1\/disciplines/, async (route) => {
      const method = route.request().method();

      if (method === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ data: mockDb }),
        });
      } else if (method === 'POST') {
        const payload = route.request().postDataJSON();
        const newDiscipline = {
          id: String(mockDb.length + 1),
          deletedAt: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          ...payload,
        };
        mockDb.push(newDiscipline);

        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({ data: newDiscipline }),
        });
      } else if (method === 'OPTIONS') {
        await route.fulfill({
          status: 200,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          },
        });
      } else if (method === 'PUT') {
        const urlObj = new URL(route.request().url());
        const id = urlObj.pathname.split('/').pop();
        const payload = route.request().postDataJSON();
        const index = mockDb.findIndex((d) => String(d.id) === String(id));

        if (index > -1) {
          mockDb[index] = { ...mockDb[index], ...payload, updatedAt: new Date().toISOString() };
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ data: mockDb[index] }),
          });
        } else {
          await route.fulfill({ status: 404, body: JSON.stringify({ error: 'Not found' }) });
        }
      } else if (method === 'DELETE') {
        const urlObj = new URL(route.request().url());
        const id = urlObj.pathname.split('/').pop();
        const index = mockDb.findIndex((d) => String(d.id) === String(id));
        if (index > -1) {
          mockDb.splice(index, 1);
        }

        await route.fulfill({ status: 204 });
      } else {
        await route.continue();
      }
    });

    await page.goto('/disciplines');
  });

  test('debe mostrar la lista de disciplinas cargada desde el network interceptado', async ({ page }) => {
    await expect(page.getByText('Falta en partido')).toBeVisible();
    await expect(page.getByText('Playwright Tester')).toBeVisible();
  });

  test('debe abrir el modal de creación y enviar el formulario de red', async ({ page }) => {
    await page.locator('button:has-text("Agregar Disciplina")').click();

    await expect(page.getByText('Agregar Nueva Disciplina')).toBeVisible();

    await page.getByPlaceholder('Ej. Falta grave en partido').fill('Nueva sanción E2E');
    await page.getByLabel(/Fecha de Inicio/i).fill('2026-05-01');
    await page.getByLabel(/Fecha de Fin/i).fill('2026-06-01');

    await page.getByRole('button', { name: 'Crear Disciplina' }).click();

    await expect(page.getByRole('button', { name: 'Crear Disciplina' })).toBeHidden();
    await expect(page.getByText('Nueva sanción E2E')).toBeVisible();
  });

  test('debe abrir el modal de edición, actualizar datos y mostrar el cambio', async ({ page }) => {
    await page.getByRole('button', { name: /Editar disciplina/i }).click();

    await expect(page.getByText('Editar Disciplina')).toBeVisible();

    await page.getByPlaceholder('Ej. Falta grave en partido').fill('Falta en partido modificada');

    await page.getByRole('button', { name: 'Guardar Cambios' }).click();

    await expect(page.getByRole('button', { name: 'Guardar Cambios' })).toBeHidden();
    await expect(page.getByText('Falta en partido modificada')).toBeVisible();
  });

  test('debe poder eliminar una disciplina tras aceptar la alerta de confirmación', async ({ page }) => {
    page.on('dialog', (dialog) => dialog.accept());

    await expect(page.getByText('Falta en partido')).toBeVisible();

    await page.getByRole('button', { name: /Eliminar disciplina/i }).click();

    await expect(page.getByText('No se encontraron disciplinas.')).toBeVisible();
    await expect(page.getByText('Falta en partido')).toBeHidden();
  });
});
