---
id: 0026
estado: Propuesto
autor: Lucas Legorburu
fecha: 2026-05-03
titulo: Modificación de Payment
---

# TDD-0026: Modificación de Payment

## Contexto de Negocio (PRD)

### Objetivo

Permitir que un administrativo actualice un pago existente mientras esté `Pending`: corregir el monto (`amount`) ingresado por teclado, la descripción y/o confirmar el estado como pagado (`Paid`). Se bloquea cualquier modificación sobre pagos cancelados por baja lógica (`deletedAt != null`), sobre pagos cuyo `status` sea `Canceled` o sobre pagos ya `Paid` respecto del monto (el `amount` solo es editable en `Pending`).

### User Persona

- **Nombre**: Laura (Administrativa de Tesorería).
- **Necesidad**: Corregir la descripción o el monto de un pago mal registrado mientras siga pendiente, o confirmar un pago pendiente como pagado (`Paid`), sin comprometer el historial de pagos del club ni violar las reglas de estado y baja lógica.

### Criterios de Aceptación

- El sistema debe validar que el pago exista antes de intentar modificarlo.
- No se permite modificar un pago dado de baja lógica (`deletedAt != null`; ver TDD-0027) ni un pago cuyo `status` sea `Canceled` (consistente con baja aplicada).
- El campo `amount` es editable **solo** mientras `status === "Pending"` y `deletedAt == null`. Si el pago está `Paid` o `Canceled`, cualquier intento de modificar `amount` se rechaza.
- **Transiciones válidas de `status` mediante este caso de uso (HTTP `PUT`):** solo `Pending → Paid`.
- **Transiciones no cubiertas por `PUT`:**
  - `Pending → Canceled` se gestiona **exclusivamente** mediante la baja lógica (`DELETE`, TDD-0027).
- **Transiciones inválidas:**
  - `Paid → Pending`
  - `Paid → Canceled` (para mantener la implementación simple: no existe anulación posterior de un pago ya marcado como `Paid`)
  - `Canceled → Pending` y `Canceled → Paid`
  - cualquier cambio cuando el registro tiene baja lógica (`deletedAt != null`).
- Una vez aplicada baja lógica (`deletedAt`), el pago no puede modificarse ni reactivarse desde este caso de uso.
- Los campos editables mediante `PUT` son: `amount` (solo con pago en `Pending` y `deletedAt == null`), `description` y `status`; solo se permite establecer `status` en `Paid` cuando el pago está en `Pending`.
- Al finalizar con éxito, el sistema debe retornar el payment actualizado dentro de `{ "data": ... }`.

## Diseño Técnico (RFC)

### Modelo de Datos

Se reutiliza la entidad `Payment` definida en TDD-0024. No se requieren cambios de esquema adicionales.

- `description`: Cadena de texto opcional — descripción o concepto del pago.
- `status`: Enumeración `PaymentStatus` — en actualización desde `Pending` solo puede pasar a `Paid` mediante este flujo.
- `amount`: Editable cuando `status === Pending` y `deletedAt == null`; si el pago está `Paid` o `Canceled`, el sistema debe rechazar cualquier intento de modificación de `amount`.
- `deletedAt`: Si no es `null`, el uso de `PUT` debe fallar conforme reglas anteriores.

### Contrato de API (@alentapp/shared)

Definiremos los tipos en el paquete compartido para asegurar sincronización.

**Éxito:** `{ "data": ... }`. **Errores:** `{ "error": "<mensaje en español>" }`.

- **Endpoint**: `PUT /api/v1/payments/:id`
- **Request Body** (`UpdatePaymentRequest`):

```ts
{
    amount?: number;      // Opcional. Solo válido cuando el estado actual es "Pending" y deletedAt es null. Debe ser > 0 si se envía.
    description?: string; // Opcional. Nuevo concepto del pago.
    status?: "Paid";      // Opcional. Solo válido cuando el estado actual es "Pending".
}
```

- **Response** `200 OK`:

```ts
{
    data: {
        id: string;
        amount: number;
        description: string | null;
        status: "Pending" | "Paid";
        paymentDate: string;
        memberId: string;
        deletedAt: string | null;
        createdAt: string;
        updatedAt: string;
    };
}
```

### Componentes de Arquitectura Hexagonal

- **Domain**:
  - Entidad `Payment`.
  - Enum `PaymentStatus`.
  - Reglas: `amount` editable solo con `status === "Pending"` y `deletedAt == null`; rechazar modificación de `amount` si `Paid` o `Canceled`; transiciones válidas `Pending → Paid` para `PUT`; rechazo cuando `deletedAt != null` o `status === "Canceled"` o intentos fuera de transición admitida.
- **Application**:
  - Caso de uso `UpdatePaymentUseCase`.
  - Puerto de salida `IPaymentRepository` (`findById`, `update`).
- **Infrastructure**:
  - `PaymentController` (entrada HTTP `PUT /api/v1/payments/:id`).
  - `PaymentPrismaRepository`.
  - Mapeadores DTO si hacen falta.

## Casos de Borde y Errores

| Escenario                                        | Resultado Esperado                                                      | Código HTTP               |
| ------------------------------------------------ | ----------------------------------------------------------------------- | ------------------------- |
| `id` del pago no existe                          | `{ "error": "El pago indicado no existe" }`                             | 404 Not Found             |
| Registro con baja lógica (`deletedAt != null`)  | `{ "error": "No se puede modificar un pago cancelado" }`                | 409 Conflict              |
| El `status` actual es `Canceled`               | `{ "error": "No se puede modificar un pago cancelado" }`                | 409 Conflict              |
| Se intenta modificar `amount` cuando el estado actual no es `Pending` | `{ "error": "El monto solo puede modificarse si el pago está pendiente" }` | 422 Unprocessable Entity |
| Transición inválida (p. ej. `Paid → Pending`) | `{ "error": "Transición de estado no permitida" }`                      | 422 Unprocessable Entity  |
| Se intenta `Paid → Canceled` vía esta API      | `{ "error": "Transición de estado no permitida" }`                       | 422 Unprocessable Entity  |
| Body vacío (sin campos editables)               | `{ "error": "Debe proveer al menos un campo para actualizar" }`         | 400 Bad Request           |
| Error de conexión a DB                         | `{ "error": "Error interno, reintente más tarde" }`                     | 500 Internal Server Error |

## Plan de Implementación

1. Crear el tipo `UpdatePaymentRequest` en `@alentapp/shared` y alinear `PaymentResponse`.
2. Incorporar en la entidad de dominio `Payment` las reglas de transición de estado y rechazo ante `deletedAt` o `Canceled`.
3. Implementar `UpdatePaymentUseCase` en la capa de aplicación.
4. Extender `IPaymentRepository`/`PaymentPrismaRepository` con persistencia controlada (`update`).
5. Crear el endpoint `PUT /api/v1/payments/:id` en `PaymentController`.
6. Conectar el formulario de edición del frontend con el nuevo endpoint.



