---
id: 0015
estado: Propuesto
autor: Luca Giordani
fecha: 2026-04-30
titulo: Consulta de Sanciones Disciplinarias
---

# TDD-0015: Consulta de Sanciones Disciplinarias

## Contexto de Negocio (PRD)

### Objetivo
Permitir a los administrativos visualizar el listado completo de sanciones/suspensiones aplicadas a los socios, así como acceder al detalle de una sancion específica, para poder gestionar el historial disciplinario desde el panel de administración.

### User Persona
- **Nombre:** Alberto (Administrativo del club).
- **Necesidad:** Ver de un vistazo todas las sanciones registradas en el sistema, a qué socio corresponden, sus fechas y si implican una suspensión total. También necesita poder consultar una sancion individual para precargar el formulario de edición.

### Criterios de Aceptación
- El sistema debe devolver el listado completo de sanciones existentes en la base de datos.
- El sistema debe permitir consultar una sancion por su `id`.
- Si la sancion solicitada no existe, debe devolver un error claro.
- La respuesta debe incluir todos los atributos de la sancion, incluido el `memberId`.
- El sistema debe permitir filtrar sanciones por socio.
- El sistema debe diferenciar sanciones activas (deletedAt es null) de desactivadas mediante el campo deletedAt en la respuesta

## Diseño Técnico (RFC)

### Contrato de API (@alentapp/shared)
Se exponen dos endpoints de lectura: uno para el listado completo y otro para el detalle individual.
**Éxito:** el cuerpo JSON usa `{ "data": ... }`. **Errores:** `{ "error": "<mensaje en español>" }`.
**Consulta por ID:**

- **Endpoint (detalle):** `GET /api/v1/disciplines/:id`
- **Response 200 OK** (`DisciplineResponse`)

**Estructura de respuesta (`DisciplineResponse`):**
```ts
{
    data: {
        id: string;
        reason: string;
        startDate: string;
        endDate: string;
        isTotalSuspension: boolean;
        memberId: string;
        deletedAt: string | null;
        createdAt: string;      
        updatedAt: string;      
    }
}
```
**Listado con filtros opcionales:**

- **Endpoint (listado):** `GET /api/v1/disciplines`
- **Response 200 OK** (`DisciplineResponse[]`)
- **Query Params opcionales:**
- `memberId`: UUID del socio (filtrar por socio específico)
- `onlyActive`: boolean (si es true, retorna solo sanciones activas; default: false)

**Estructura de respuesta (`DisciplineResponse`):**

```ts
{
    data: Array<{
        id: string;
        reason: string;
        startDate: string;
        endDate: string;
        isTotalSuspension: boolean;
        memberId: string;
        deletedAt: string | null;
        createdAt: string;
        updatedAt: string;
    }>
}
```
Nota: Las sanciones con deletedAt != null (desactivadas) pueden ser consultadas pero no editadas ni reactivadas desde el UPDATE endpoint.

### Componentes de Arquitectura Hexagonal
1. **Puerto:** `IDisciplineRepository` (Métodos `findAll(filters?)` y `findById(id)`).
2. **Caso de Uso:** `GetDisciplinesUseCase` (Devuelve el listado completo) y `GetDisciplineByIdUseCase` (Comprueba existencia y devuelve el detalle).
3. **Adaptador de Salida:** `PostgresDisciplineRepository` (Lectura usando los métodos `findMany` y `findUnique` de Prisma).
4. **Adaptador de Entrada:** `DisciplineController` (Rutas HTTP que devuelven los resultados serializados).

## Casos de Borde y Errores

| Escenario                                | Resultado Esperado                                | Código HTTP               |
| -----------------------------------------| ----------------------------------------------    | --------------------------|
| Listado sin sanciones cargadas           | { "data": [] }                                    | 200 OK                    |
| Consulta exitosa de listado              | { "data": [...] }                                 | 200 OK                    |
| Consulta exitosa por `id`                | { "data": {...} }                                 | 200 OK                    |
| Sanción inexistente al consultar por `id`| { "error": "La sanción no existe" }               | 404 Not Found             |
| Error de conexión a DB                   | { "error": "Error interno, reintente más tarde" } | 500 Internal Server Error |

## Plan de Implementación
1. Crear el modelo de dominio `Discipline` y el puerto `IDisciplineRepository` con los métodos `findAll` y `findById`.
2. Implementar `PostgresDisciplineRepository` usando `findMany` y `findUnique` de Prisma.
3. Crear los casos de uso `GetDisciplinesUseCase` y `GetDisciplineByIdUseCase`.
4. Crear los endpoints `GET /api/v1/disciplines` y `GET /api/v1/disciplines/:id` en el `DisciplineController` y registrarlos en `app.ts`.
5. Añadir los métodos `findAll` y `findById` al servicio Frontend (`disciplines.ts`).
6. Conectar la tabla principal en `DisciplinesView.tsx` para que consuma `findAll` al montarse.