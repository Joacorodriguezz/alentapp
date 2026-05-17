---
id: 0025
estado: Propuesto
autor: Lucas Legorburu
fecha: 2026-05-03
titulo: Consulta de Payment
---

# TDD-0025: Consulta de Payment

## Contexto de Negocio (PRD)

### Objetivo

Permitir que un administrativo consulte el detalle de un pago puntual o el listado completo de pagos, con posibilidad de filtrar por socio o estado, facilitando el seguimiento y auditoría del historial de pagos del club.

### User Persona

- **Nombre**: Laura (Administrativa de Tesorería).
- **Necesidad**: Verificar el estado actual de un pago específico o revisar todos los pagos registrados para un socio, de modo de detectar deudas pendientes o confirmar cobros realizados.

### Criterios de Aceptación

- El sistema debe permitir obtener un único pago a partir de su `id`.
- Si el `id` no corresponde a ningún pago existente (entre los registros vigentes definidos más abajo), el sistema debe responder con un error `404`.
- El sistema debe permitir listar los pagos registrados.
- El listado debe admitir filtros opcionales por `memberId` y por `status`.
- Para el listado “operativo”, el sistema debe excluir los pagos cuya baja lógica esté efectuada (`deletedAt != null`), salvo que en el futuro se agregue un modo explícito de historial/auditoría.
- Para la obtención por `id`, el sistema debe responder `404` si el pago no existe **o** si fue dado de baja de forma lógica (`deletedAt != null`), a menos que se defina en otra historia un modo de auditoría explícito.
- Cada ítem del listado debe incluir los campos acordados en `PaymentResponse`, incluyendo `status`, `deletedAt` y timestamps.
- Si no existen pagos que coincidan con los filtros aplicados, el sistema debe retornar una lista vacía (no es error): `{ "data": [] }`.

## Diseño Técnico (RFC)

### Modelo de Datos

Se reutiliza la entidad `Payment` definida en TDD-0024 (persistencia en base de datos):

- Para listados cotidianos, considerar únicamente filas con `deletedAt === null`.
- Consultas con filtros: condiciones opcionales por `memberId` y/o `status` sobre el conjunto vigente anterior.

### Contrato de API (@alentapp/shared)

Definiremos los tipos en el paquete compartido para asegurar sincronización.

**Éxito:** el cuerpo JSON usa `{ "data": ... }`. **Errores:** `{ "error": "<mensaje en español>" }`.

**Consulta por ID:**

- **Endpoint**: `GET /api/v1/payments/:id`
- **Request Body**: Ninguno.
- **Response** `200 OK`:

```ts
{
    data: {
        id: string;
        amount: number;
        description: string | null;
        status: "Pending" | "Paid" | "Canceled";
        paymentDate: string;
        memberId: string;
        deletedAt: string | null;
        createdAt: string;
        updatedAt: string;
    };
}
```

**Listado con filtros opcionales:**

- **Endpoint**: `GET /api/v1/payments`
- **Query Params**:

```ts
{
    memberId?: string; // Filtrar por socio.
    status?: "Pending" | "Paid" | "Canceled"; // Filtrar por estado de negocio.
}
```

- **Response** `200 OK`:

```ts
{
    data: Array<{
        id: string;
        amount: number;
        description: string | null;
        status: "Pending" | "Paid" | "Canceled";
        paymentDate: string;
        memberId: string;
        deletedAt: string | null;
        createdAt: string;
        updatedAt: string;
    }>;
}
```

### Componentes de Arquitectura Hexagonal

- **Domain**:
  - Entidad `Payment`.
  - Enum `PaymentStatus`.
  - Reglas de negocio mínimas asociadas a la consulta (por ejemplo que un pago cancelado por baja lógica no forme parte del listado operativo si `deletedAt` está seteado).
- **Application**:
  - Caso de uso `GetPaymentByIdUseCase`: obtiene un pago por `id` respetando la regla de exclusión por `deletedAt` indicada en criterios de aceptación.
  - Caso de uso `ListPaymentsUseCase`: lista con filtros opcionales excluyendo `deletedAt != null` en el alcance operativo.
  - Puerto de salida `IPaymentRepository` (`findById`, `findAll` con criterios).
- **Infrastructure**:
  - `PaymentController` (rutas HTTP `GET /api/v1/payments/:id` y `GET /api/v1/payments`).
  - `PaymentPrismaRepository` (u otro adaptador equivalente).
  - Mapeadores DTO si hacen falta.

## Casos de Borde y Errores

| Escenario                                  | Resultado Esperado                                      | Código HTTP               |
| ------------------------------------------ | ------------------------------------------------------- | ------------------------- |
| `id` del pago no existe                    | `{ "error": "El pago indicado no existe" }`                   | 404 Not Found             |
| `id` con formato inválido (no UUID)        | `{ "error": "El identificador proporcionado no es válido" }`  | 400 Bad Request           |
| Filtro `status` con valor no permitido     | `{ "error": "El estado indicado no es válido" }`              | 400 Bad Request           |
| Filtro `memberId` de socio inexistente   | Retorna lista vacía `{ "data": [] }`                      | 200 OK                    |
| No hay pagos registrados (vigentes)        | Retorna lista vacía `{ "data": [] }`                      | 200 OK                    |
| Error de conexión a DB                     | `{ "error": "Error interno, reintente más tarde" }`           | 500 Internal Server Error |

## Plan de Implementación

1. Crear en `@alentapp/shared` los tipos `PaymentResponse` y `PaymentListResponse` (listado dentro de `{ data: ... }`).
2. Definir en `IPaymentRepository` los métodos `findById` y `findAll` con soporte de filtros y exclusión por `deletedAt` según alcance operativo.
3. Implementar `GetPaymentByIdUseCase` y `ListPaymentsUseCase` en la capa de aplicación.
4. Implementar consultas correspondientes en `PaymentPrismaRepository`.
5. Crear los endpoints `GET /api/v1/payments/:id` y `GET /api/v1/payments` en `PaymentController`.
6. Integrar la vista de listado y detalle en el frontend consumiendo los nuevos endpoints.


