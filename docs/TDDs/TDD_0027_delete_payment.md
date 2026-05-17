---
id: 0027
estado: Propuesto
autor: Lucas Legorburu
fecha: 2026-05-03
titulo: Baja Lógica de Payment
---

# TDD-0027: Baja Lógica de Payment

## Contexto de Negocio (PRD)

### Objetivo

Permitir que un administrativo cancele un pago registrado **sin borrar físicamente** el registro en base de datos. La operación debe marcar baja lógica (`deletedAt`) y llevar el `status` a `Canceled`, preservando trazabilidad y auditoría. El método HTTP será `DELETE` por consistencia con el resto de recursos del TP, aclarándose siempre que no implica borrado físico.

### User Persona

- **Nombre**: Laura (Administrativa de Tesorería).
- **Necesidad**: Anular un pago cargado por error o que ya no corresponde cuando aún está `Pending`, sin perder el rastro del registro original ni violar las reglas financieras acordadas (versión simplificada: no se permite anular un pago ya `Paid`; ver criterios).

### Criterios de Aceptación

- El sistema debe validar que el pago exista antes de intentar la operación.
- El sistema **no debe eliminar físicamente** el registro bajo ninguna circunstancia.
- La baja lógica debe establecer **`status` igual a `"Canceled"`** y **`deletedAt`** con fecha/hora actual (no `null` tras aplicar).
- La baja lógica está permitida únicamente si el registro **`deletedAt` es `null`**. Si ya está dado de baja (`deletedAt != null`), la operación se rechaza.
- Para esta implementación **simple**, la baja lógica desde `DELETE` se permite **solo** cuando el estado de negocio actual es **`Pending`**. Si el pago está en **`Paid`**, se debe rechazar (no hay anulación posterior en esta versión).
- **Ajuste respecto de la redacción inicial (TDD-0024):** **se permite modificar `amount` siempre que el pago siga en `Pending` y `deletedAt == null`**. Una vez aplicada la cancelación (`deletedAt` seteado y `status === "Canceled"`), el pago no puede modificarse ni reactivarse.
- Los listados habituales **excluyen** pagos con `deletedAt != null`, salvo un futuro modo explícito de historial (fuera del alcance mínimo de este texto).
- Al finalizar con éxito, el sistema debe devolver `{ "data": ... }` con el payment actualizado, incluyendo `status`, `deletedAt`, `updatedAt` y los demás campos de respuesta habitual.

## Diseño Técnico (RFC)

### Modelo de Datos

Se reutiliza la entidad `Payment` definida en TDD-0024 (persistencia en base de datos). La cancelación mediante este endpoint actualiza sobre el mismo registro:

- `status`: debe quedar `"Canceled"` (estado de negocio).
- `deletedAt`: marca de baja lógica; se establece con la marca temporal actual al ejecutar esta operación.
- `updatedAt`: refleja la última modificación tras la cancelación.

El resto de campos (`amount`, `description`, `paymentDate`, `memberId`, `createdAt`) permanece intactos. **No existe** eliminación de filas.

### Contrato de API (@alentapp/shared)

La operación se expresa con `DELETE`, pero contractualmente describe **solo** cancelación persistida como baja lógica (`deletedAt`), no borrado físico.

**Éxito:** `{ "data": ... }`. **Errores:** `{ "error": "<mensaje en español>" }`.

- **Endpoint**: `DELETE /api/v1/payments/:id`
- **Request Body**: ninguno.
- **Response** `200 OK`:

```ts
{
    data: {
        id: string;
        amount: number;
        description: string | null;
        status: "Canceled";
        paymentDate: string;
        memberId: string;
        deletedAt: string;
        createdAt: string;
        updatedAt: string;
    };
}
```

> **Nota:** Aunque el verbo HTTP es `DELETE`, el backend **no** borra físicamente el registro en base de datos. Solo ejecuta cancelación persistente mediante `status` + `deletedAt`.

### Componentes de Arquitectura Hexagonal

- **Domain**:
  - Entidad `Payment`.
  - Enum `PaymentStatus`.
  - Reglas: prohibir borrado físico, validar estado previo (`Pending`), validar ausencia previa de baja (`deletedAt == null`), al aplicar establecer `Canceled` + `deletedAt`.
- **Application**:
  - Caso de uso `DeletePaymentUseCase` (alineado con el verbo HTTP `DELETE` del endpoint).
  - Puerto de salida `IPaymentRepository` (`findById`, método de persistencia de baja lógica / `update` controlado).
- **Infrastructure**:
  - `PaymentController` (entrada HTTP `DELETE /api/v1/payments/:id`).
  - `PaymentPrismaRepository`.
  - Mapeadores DTO si hacen falta.

## Casos de Borde y Errores

| Escenario                                   | Resultado Esperado                                                | Código HTTP               |
| ------------------------------------------- | ----------------------------------------------------------------- | ------------------------- |
| `id` del pago no existe                     | `{ "error": "El pago indicado no existe" }`                             | 404 Not Found             |
| Baja ya aplicada (`deletedAt != null`)      | `{ "error": "El pago ya se encuentra cancelado" }`                      | 409 Conflict              |
| `status` actual es `Canceled` sin coherencia de datos | `{ "error": "El pago ya se encuentra cancelado" }`               | 409 Conflict              |
| `status` es `Paid` (anulación no permitida)| `{ "error": "No se puede cancelar un pago ya confirmado como pagado" }` | 422 Unprocessable Entity  |
| `id` con formato inválido (no UUID)         | `{ "error": "El identificador proporcionado no es válido" }`           | 400 Bad Request           |
| Error de conexión a DB                      | `{ "error": "Error interno, reintente más tarde" }`                     | 500 Internal Server Error |

## Plan de Implementación

1. Asegurar en el modelo de persistencia el campo nullable `deletedAt` y valores de `PaymentStatus`, acorde al TDD-0024.
2. Implementar método de dominio o servicio aplicativo que ejecute solo baja lógica (sin `DELETE` SQL físico).
3. Implementar `DeletePaymentUseCase` en aplicación usando `IPaymentRepository`.
4. Implementar persistencia mediante `PaymentPrismaRepository` (actualización de fila existente).
5. Crear el endpoint `DELETE /api/v1/payments/:id` en `PaymentController`, documentando que no efectúa borrado físico.
6. En el frontend, acción equivalente (“Cancelar pago”) usando `DELETE`, con mensaje aclaratorio al usuario cuando corresponda.

