/**
 * Seed de datos: crea Socios y Certificados Médicos a través de la API REST.
 *
 * Se usa la API (y no Prisma directo) a propósito, para que se apliquen TODAS
 * las validaciones y reglas de negocio de los TDD:
 *   - TDD-0020: el socio debe existir; expiryDate > issueDate; al crear un nuevo
 *               certificado se invalidan automáticamente los anteriores del socio
 *               (sólo el último queda Vigente).
 *   - TDD-0029: los certificados quedan consultables por DNI del socio.
 *
 * Requisitos: la API debe estar corriendo (npm run dev en packages/api) y la base
 * de datos accesible.
 *
 * Uso (desde packages/api):
 *   npm run seed:medical
 *   MEMBERS=40 CERTS_MAX=3 API_URL=http://localhost:3000 npm run seed:medical
 */

const API_URL = (process.env.API_URL ?? "http://localhost:3000") + "/api/v1";
const MEMBER_COUNT = Number(process.env.MEMBERS ?? 25);
const CERTS_MAX = Math.max(1, Number(process.env.CERTS_MAX ?? 3));

const NOMBRES = [
  "Juan", "María", "Lucas", "Sofía", "Mateo", "Valentina", "Benjamín", "Martina",
  "Thiago", "Camila", "Joaquín", "Catalina", "Santiago", "Isabella", "Tomás",
  "Emma", "Lautaro", "Renata", "Bautista", "Mía", "Felipe", "Delfina", "Ramiro",
  "Julieta", "Agustín", "Victoria", "Franco", "Pilar", "Nicolás", "Guadalupe",
];

const APELLIDOS = [
  "Gómez", "Rodríguez", "Fernández", "López", "Martínez", "Díaz", "Pérez",
  "Sánchez", "Romero", "Sosa", "Torres", "Álvarez", "Ruiz", "Ramírez", "Flores",
  "Acosta", "Benítez", "Medina", "Herrera", "Aguirre", "Molina", "Castro",
];

const INSTITUCIONES = [
  "Hospital San Martín", "Clínica del Sol", "Sanatorio Allende", "Hospital Italiano",
  "Centro Médico Norte", "Clínica Reina Fabiola", "Hospital Privado", "Sanatorio Mayo",
];

const CATEGORIES = ["Pleno", "Cadete", "Honorario"] as const;

function randInt(maxExclusive: number): number {
  return Math.floor(Math.random() * maxExclusive);
}

function pick<T>(arr: readonly T[]): T {
  return arr[randInt(arr.length)];
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function formatDate(year: number, monthIdx: number, day: number): string {
  // YYYY-MM-DD (formato aceptado por la entidad de dominio).
  return `${year}-${pad2(monthIdx + 1)}-${pad2(day)}`;
}

interface ApiResult<T> {
  ok: boolean;
  status: number;
  data?: T;
  error?: string;
}

async function postJson<T>(path: string, body: unknown): Promise<ApiResult<T>> {
  const response = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  let json: any = {};
  try {
    json = await response.json();
  } catch {
    /* respuestas sin cuerpo (p. ej. 204) */
  }
  return {
    ok: response.ok,
    status: response.status,
    data: json?.data as T,
    error: json?.error as string,
  };
}

async function apiIsReachable(): Promise<boolean> {
  try {
    const response = await fetch(`${API_URL}/socios`);
    return response.ok;
  } catch {
    return false;
  }
}

async function main() {
  console.log(`\n🌱 Seed Medical Data → ${API_URL}`);
  console.log(`   Socios a crear: ${MEMBER_COUNT} | Certificados por socio: 1..${CERTS_MAX}\n`);

  if (!(await apiIsReachable())) {
    console.error(
      `❌ No se pudo contactar la API en ${API_URL}.\n` +
        `   Asegurate de tener la API corriendo (cd packages/api && npm run dev) ` +
        `y la base de datos accesible.`,
    );
    process.exit(1);
  }

  // Base de DNI aleatoria para reducir colisiones con datos ya existentes.
  const dniBase = 30_000_000 + randInt(5_000_000);

  let membersCreated = 0;
  let membersSkipped = 0;
  let membersFailed = 0;
  let certsCreated = 0;
  let certsFailed = 0;

  const createdDnis: string[] = [];

  // 1) Crear socios (TDD: el socio debe existir antes de cargar un certificado).
  for (let i = 0; i < MEMBER_COUNT; i++) {
    const dni = String(dniBase + i);
    const name = `${pick(NOMBRES)} ${pick(APELLIDOS)}`;
    // Adultos (1960..2003) para mantener variedad de categorías.
    const birthYear = 1960 + randInt(44);
    const member = {
      dni,
      name,
      email: `socio${dni}@seed.alentapp.test`,
      birthdate: formatDate(birthYear, randInt(12), 1 + randInt(28)),
      category: pick(CATEGORIES),
    };

    const res = await postJson<{ dni: string }>("/socios", member);
    if (res.ok) {
      membersCreated++;
      createdDnis.push(dni);
    } else if (res.status === 409) {
      membersSkipped++; // DNI o email ya existente
    } else {
      membersFailed++;
      console.warn(`   ⚠️  Socio ${dni} no creado (${res.status}): ${res.error ?? "error"}`);
    }
  }

  // 2) Crear certificados por socio. Cadena anual creciente: cada nuevo certificado
  //    invalida los previos (lógica del backend), por lo que sólo el último queda Vigente.
  const currentYear = new Date().getFullYear();
  for (const dni of createdDnis) {
    const certsCount = 1 + randInt(CERTS_MAX);
    const startYear = currentYear - certsCount; // el último expira ~este año
    const monthIdx = randInt(12);
    const day = 1 + randInt(28);

    for (let k = 0; k < certsCount; k++) {
      const issueYear = startYear + k;
      const certificate = {
        dni,
        issueDate: formatDate(issueYear, monthIdx, day),
        expiryDate: formatDate(issueYear + 1, monthIdx, day), // expiry > issue ✓
        doctorLicence: `MP ${10000 + randInt(89999)}`,
        institution: pick(INSTITUCIONES),
      };

      const res = await postJson("/medical-certificates", certificate);
      if (res.ok) {
        certsCreated++;
      } else {
        certsFailed++;
        console.warn(
          `   ⚠️  Certificado de ${dni} no creado (${res.status}): ${res.error ?? "error"}`,
        );
      }
    }
  }

  console.log("\n✅ Seed finalizado");
  console.log(`   Socios:        ${membersCreated} creados, ${membersSkipped} omitidos, ${membersFailed} con error`);
  console.log(`   Certificados:  ${certsCreated} creados, ${certsFailed} con error\n`);
}

main().catch((err) => {
  console.error("❌ Error inesperado en el seed:", err);
  process.exit(1);
});
