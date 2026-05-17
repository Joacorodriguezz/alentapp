---
id: 0006
estado: Propuesto
autor: Joaquin Rodriguez
fecha: 2026-04-30
titulo: Eliminación de Lockers Existentes
---

# TDD-0006: Eliminación de Lockers Existentes

## Contexto de Negocio (PRD)

### Objetivo

Permitir a los administrativos dar de baja permanentemente a un locker del sistema, eliminando su registro de la base de datos para mantener el inventario actualizado y libre de registros duplicados o cargados erróneamente.

### User Persona

- Nombre: Alberto (Tesorero/Administrativo).
- Necesidad: Borrar un locker que fue cargado por error o que ya no forma parte del inventario del club, de forma rápida desde la misma tabla principal. Necesita una advertencia antes de borrar para no cometer equivocaciones irreparables.

### Criterios de Aceptación

- El sistema debe pedir una confirmación explícita (advertencia visual) antes de proceder con el borrado.
- El sistema debe validar que el locker exista antes de intentar borrarlo.
- El sistema debe realizar un borrado físico de la base de datos (hard delete).
- El locker tiene que tener `memberId = null` para poder borrarse.
- Si el borrado es exitoso, la tabla debe actualizarse automáticamente.

## Diseño Técnico (RFC)

### Contrato de API (@alentapp/shared)

Al tratarse de una operación destructiva que solo requiere conocer el identificador, no se envía cuerpo en la petición HTTP.

*   **Endpoint**: `DELETE /api/v1/lockers/:id`
*   **Request Body**: `None`
*   **Response 200 OK**
```ts
{
  data: {
    id: string;
  }
}
```

### Componentes de Arquitectura Hexagonal

- Dominio
  - Entity: `Locker`
  - Value Objects/Enums (van en el Shared ya que los usan tanto en back como el front)
    - `LockerStatus`
  - DomainService: `LockerValidator` o `LockerDomainService`
    - Valida que el locker exista.
    - Valida que `memberId` sea `null` antes de permitir el borrado.
- Aplicacion
  - Caso de Uso
    - `DeleteLockerUseCase`
  - Puertos
    - `ILockerRepository`
      - `findById(id)`
      - `delete(id)`
  - DTOs (Van en el Shared ya que los usan tanto en back como el front)
    - No aplica request body: se usa el `id` de la ruta.
    - `DeleteLockerResponse` o respuesta simple `{ id: string }`.
- Infraestructura
  - Adaptadores de Entrada
    - `LockerController`
    - `LockerRouter`
      - Registra el endpoint `DELETE /api/v1/lockers/:id`.
  - Adaptadores de Salida
    - `PostgresLockerRepository`
  - Mappers
    - `LockerPersistenceMapper` con los metodos:
      - `ToPersistence`
      - `ToDomain`
    - `LockerDTOMapper` con los metodos:
      - `ToDTO`
      - Para pasar de DTO a dominio se usa el constructor de la entidad `Locker()` si la operacion necesita reconstruir el dominio desde datos persistidos.

## Casos de Borde y Errores

| Escenario                  | Resultado Esperado                            | Código HTTP               |
| -------------------------- | --------------------------------------------- | ------------------------- |
| `id` inválido              | `{ error: "El id del locker es inválido" }`   | 400 Bad Request           |
| Locker inexistente         | `{ error: "El locker no existe" }`            | 404 Not Found             |
| Locker asignado a un socio (`memberId` no es `null`) | `{ error: "No se puede eliminar un locker asignado a un socio" }` | 409 Conflict |
| Error de conexión a DB     | `{ error: "Error interno, reintente más tarde" }` | 500 Internal Server Error |
| Eliminación exitosa        | `{ data: { id: string } }`                    | 200 OK                    |

## Plan de Implementación

1. Ampliar el `ILockerRepository` y `PostgresLockerRepository` con el método `delete`.
2. Crear la lógica de negocio en `DeleteLockerUseCase`.
3. Crear el endpoint `DELETE /api/v1/lockers/:id` en el `LockerController`, registrarlo en `LockerRouter` y montar el router en `app.ts` si aún no está montado.
4. Añadir el método `delete` al servicio Frontend (`lockers.ts`).
5. Enlazar el botón de eliminación en `LockersView.tsx` agregando la confirmación del navegador (`window.confirm`) antes de hacer la llamada.
