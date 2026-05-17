---
id: 0005
estado: Propuesto
autor: Joaquin Rodriguez
fecha: 2026-04-30
titulo: Actualización de Lockers Existentes
---

# TDD-0005: Actualización de Lockers Existentes

## Contexto de Negocio (PRD)

### Objetivo

Permitir a los administrativos corregir o modificar la información de un locker existente en el sistema, como su estado, locacion o id de socio.

### User Persona

- Nombre: Alberto (Tesorero/Administrativo).
- Necesidad: Modificar datos de los lockers rápidamente desde la tabla del panel de administración. Por ejemplo, actualizar a un socio que alquilo el locker y asignandole a ese locker el id del socio, o cambiar el estado del locker a `Manteinance`.

### Criterios de Aceptación

- El sistema debe permitir actualizar uno, varios o todos los campos del locker.
- El sistema debe validar que, si se cambia el numero, este no pertenezca ya a otro locker.
- El sistema debe validar que el estado no sea 'Maintenance' cuando se quiere modificar un memberId.
- Si la edición es correcta, debe retornar los nuevos datos del locker  actualizados.
-El sistema debe validar que al cargar un memberId, este socio exista
-Si se quiere pasar un locker a estado 'Maintenance' se debe desocupar el locker primero
-El sistema debe actualizar automaticamente el estado a 'Occupied' si se carga un memberId
-Si el sistema recibe `memberId: null`, se tiene que actualizar automaticamente el estado a 'Available'

## Diseño Técnico (RFC)

### Contrato de API (@alentapp/shared)

Se utilizará el paquete compartido para definir el cuerpo de la petición. Todos los campos son opcionales ya que se trata de una actualización parcial (PATCH a nivel de negocio, aunque el endpoint implemente PUT).

*   **Endpoint**: `PUT /api/v1/lockers/:id`
*   **Request Body**: UpdateLockerRequest
```ts
{
    number?: number;
    location?: string;
    status?:  'Maintenance'; // Es solo Maintenance aca porque el Available y el Occupied se actualizan solos cuando se pone en null o se carga un memberId 
    memberId?: string | null;
}
```
*   **Response 200 OK**
```ts
{
  data: {
    id: string;
    number: number;
    location: string;
    status: 'Available' | 'Occupied' | 'Maintenance';
    memberId: string | null;
  }
}
```

### Componentes de Arquitectura Hexagonal

- Dominio
  - Entity: `Locker`
  - Value Objects/Enums (van en el Shared ya que los usan tanto en back como el front)
    - `LockerStatus`
  - DomainService: `LockerValidator` o `LockerDomainService`
    - Valida `number`, `location` y `status`.
    - Valida que no se asigne un socio a un locker en `Maintenance`.
    - Valida que un locker asignado no pueda pasar a `Maintenance`.
    - Define la transicion automatica de estado segun `memberId`: `Occupied` si tiene socio y `Available` si queda en `null`.
- Aplicacion
  - Caso de Uso
    - `UpdateLockerUseCase`
  - Puertos
    - `ILockerRepository`
      - `findById(id)`
      - `findByNumber(number)`
      - `update(id, data)`
    - `IMemberRepository`
      - `findById(memberId)` para validar que el socio exista cuando se asigna un locker.
  - DTOs (Van en el Shared ya que los usan tanto en back como el front)
    - `UpdateLockerRequest`
    - `LockerResponse`
- Infraestructura
  - Adaptadores de Entrada
    - `LockerController`
    - `LockerRouter`
      - Registra el endpoint `PUT /api/v1/lockers/:id`.
  - Adaptadores de Salida
    - `PostgresLockerRepository`
  - Mappers
    - `LockerPersistenceMapper` con los metodos:
      - `ToPersistence`
      - `ToDomain`
    - `LockerDTOMapper` con los metodos:
      - `ToDTO`
      - Para pasar de DTO a dominio se usa el constructor de la entidad `Locker()`.

## Casos de Borde y Errores

| Escenario                                         | Resultado Esperado                                                  | Código HTTP               |
| ------------------------------------------------- | ------------------------------------------------------------------- | ------------------------- |
| `memberId` no corresponde a ningun socio           | `{ error: "El socio solicitado no existe" }`                         | 404 Not Found             |
| Locker inexistente (`id` no encontrado)           | `{ error: "El locker solicitado no existe" }`                        | 404 Not Found             |
| `number` ya pertenece a otro locker               | `{ error: "Ya existe un locker con ese número" }`                    | 409 Conflict              |
| `number` vacío o inválido                         | `{ error: "El numero debe ser un entero positivo" }`                 | 400 Bad Request           |
| `location` vacía o inválida                       | `{ error: "La ubicación es obligatoria" }`                           | 400 Bad Request           |
| `status` inválido                                 | `{ error: "Estado de locker inválido" }`                             | 400 Bad Request           |
| Asignar `memberId` a un locker en `Maintenance`   | `{ error: "No se puede asignar un socio a un locker en mantenimiento" }` | 409 Conflict           |
| Cambiar a `Maintenance` un locker con `memberId` asignado | `{ error: "No se puede poner un locker en mantenimiento si tiene un miembro asociado" }` | 409 Conflict |
| Cambiar a `Maintenance` un locker con `memberId: null` | `{ data: LockerResponse }` con `status: 'Maintenance'`          | 200 OK |
| Asignar un `memberId` válido                      | `{ data: LockerResponse }` con `status: 'Occupied'`                  | 200 OK                    |
| Enviar `memberId: null`                           | `{ data: LockerResponse }` con `status: 'Available'`                 | 200 OK                    |
| Body sin ningún campo válido                      | `{ error: "Debe enviar al menos un campo a actualizar" }`            | 400 Bad Request           |
| Error de conexión a DB                            | `{ error: "Error interno, reintente más tarde" }`                    | 500 Internal Server Error |

## Plan de Implementación

1. Actualizar las interfaces en el paquete `@alentapp/shared` agregando `UpdateLockerRequest`.
2. Ampliar el `ILockerRepository` con el método `update`.
3. Implementar la lógica en `UpdateLockerUseCase` utilizando el `LockerValidator` centralizado.
4. Crear la ruta `PUT /api/v1/lockers/:id` en el `LockerController`, registrarla en `LockerRouter` y montar el router en `app.ts` si aún no está montado.
5. Consumir el endpoint desde el frontend y reutilizar el modal de creación para permitir la edición.
