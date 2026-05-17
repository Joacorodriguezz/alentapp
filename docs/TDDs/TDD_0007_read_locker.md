---
id: 0007
estado: Propuesto
autor: Joaquin Rodriguez
fecha: 2026-04-30
titulo: Consulta de Lockers
---

# TDD-0007: Consulta de Lockers

## Contexto de Negocio (PRD)

### Objetivo

Permitir a los administrativos visualizar el listado completo de lockers del club, así como acceder al detalle de un locker específico, para poder gestionar el inventario y las asignaciones a socios desde el panel de administración.

### User Persona

- Nombre: Alberto (Tesorero/Administrativo).
- Necesidad: Ver de un vistazo todos los lockers del club, su estado actual y a qué socio están asignados, para tomar decisiones rápidas (asignar uno libre, identificar lockers en mantenimiento, ubicar el locker de un socio puntual). También necesita poder consultar un locker individual para precargar el formulario de edición.

### Criterios de Aceptación

- El sistema debe devolver el listado completo de lockers existentes en la base de datos.
- El sistema debe permitir consultar un locker por su `id`.
- Si el locker solicitado no existe, debe devolver un error claro.
- La respuesta debe incluir todos los atributos del locker, incluido el `memberId` (que puede ser `null` si no está asignado).

## Diseño Técnico (RFC)

### Contrato de API (@alentapp/shared)

Se exponen dos endpoints de lectura: uno para el listado completo y otro para el detalle individual.

```ts
type LockerResponse = {
  id: string;
  number: number;
  location: string;
  status: 'Available' | 'Occupied' | 'Maintenance';
  memberId: string | null;
}
```

*   **Endpoint (listado)**: `GET /api/v1/lockers`
*   **Response 200 OK** (`LockerResponse[]`)
```ts
{
  data: LockerResponse[];
}
```

*   **Endpoint (detalle)**: `GET /api/v1/lockers/:id`
*   **Response 200 OK** (`LockerResponse`)
```ts
{
  data: LockerResponse;
}
```


### Componentes de Arquitectura Hexagonal

- Dominio
  - Entity: `Locker`
  - Value Objects/Enums (van en el Shared ya que los usan tanto en back como el front)
    - `LockerStatus`
  - DomainService
    - No aplica para el listado simple.
    - Para el detalle, la validacion de existencia puede quedar en el caso de uso.
- Aplicacion
  - Caso de Uso
    - `GetLockersUseCase`
    - `GetLockerByIdUseCase`
  - Puertos
    - `ILockerRepository`
      - `findAll()`
      - `findById(id)`
  - DTOs (Van en el Shared ya que los usan tanto en back como el front)
    - No aplica request body: el listado no usa body y el detalle usa el `id` de la ruta.
    - `LockerResponse`
- Infraestructura
  - Adaptadores de Entrada
    - `LockerController`
    - `LockerRouter`
      - Registra los endpoints `GET /api/v1/lockers` y `GET /api/v1/lockers/:id`.
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

| Escenario                                | Resultado Esperado                            | Código HTTP               |
| ---------------------------------------- | --------------------------------------------- | ------------------------- |
| Listado sin lockers cargados             | `{ data: [] }`                                 | 200 OK                    |
| Consulta exitosa de listado              | `{ data: LockerResponse[] }`                   | 200 OK                    |
| Consulta exitosa por `id`                | `{ data: LockerResponse }`                     | 200 OK                    |
| `id` inválido                            | `{ error: "El id del locker es inválido" }`   | 400 Bad Request           |
| Locker inexistente al consultar por `id` | `{ error: "El locker no existe" }`            | 404 Not Found             |
| Error de conexión a DB                   | `{ error: "Error interno, reintente más tarde" }` | 500 Internal Server Error |

## Plan de Implementación

1. Ampliar el `ILockerRepository` y `PostgresLockerRepository` con los métodos `findAll` y `findById`.
2. Crear la lógica de los casos de uso `GetLockersUseCase` y `GetLockerByIdUseCase`.
3. Crear los endpoints `GET /api/v1/lockers` y `GET /api/v1/lockers/:id` en el `LockerController` y registrarlos en `LockerRouter`.
4. Añadir los métodos `getAll` y `getById` al servicio Frontend (`lockers.ts`).
5. Conectar la tabla principal en `LockersView.tsx` para que consuma `getAll` al montarse y al refrescar después de cada operación de ABM.
