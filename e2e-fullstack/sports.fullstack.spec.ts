import { test, expect } from '@playwright/test';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../packages/api/src/generated/client/client.js';

const API_URL = 'http://localhost:3001';
const DATABASE_URL = 'postgresql://admin:password123@localhost:5433/alentapp_test_db';

test.describe('Sport API Full-Stack E2E', () => {
  let prisma: PrismaClient;
  let createdSportId = '';
  const sportName = `E2E Sport ${Date.now()}`;

  test.beforeAll(async () => {
    prisma = new PrismaClient({
      adapter: new PrismaPg(DATABASE_URL),
    });
    await prisma.$connect();
  });

  test.afterAll(async () => {
    if (createdSportId) {
      await prisma.sport.deleteMany({ where: { id: createdSportId } });
    }
    await prisma.$disconnect();
  });

  test('GET /api/v1/sports debe retornar deportes desde la base de datos real', async ({ request }) => {
    const response = await request.get(`${API_URL}/api/v1/sports`);

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(Array.isArray(body.data)).toBe(true);
  });

  test('POST /api/v1/sports debe persistir el deporte en PostgreSQL', async ({ request }) => {
    const response = await request.post(`${API_URL}/api/v1/sports`, {
      data: {
        name: sportName,
        maxCapacity: 15,
        requiresMedicalCertificate: false,
      },
    });

    expect(response.status()).toBe(201);
    const body = await response.json();
    createdSportId = body.data.id;

    const dbSport = await prisma.sport.findUnique({ where: { id: createdSportId } });
    expect(dbSport?.name).toBe(sportName);
    expect(dbSport?.maxCapacity).toBe(15);
  });

  test('DELETE /api/v1/sports/:id debe eliminar el deporte de PostgreSQL', async ({ request }) => {
    const response = await request.delete(`${API_URL}/api/v1/sports/${createdSportId}`);

    expect(response.status()).toBe(204);

    const dbSport = await prisma.sport.findUnique({ where: { id: createdSportId } });
    expect(dbSport).toBeNull();
    createdSportId = '';
  });
});
