---
id: 0004
estado: Propuesto
autor: Joaquin Rodriguez
fecha: 2026-04-30
titulo: Registro de Nuevo Locker
---


# TDD-0004: Registro de Nuevo Locker

## Contexto de Negocio (PRD)

### Objetivo
Eliminar el registro manual de los lockers del club en planillas de papel, permitiendo que un administrativo dé de alta un nuevo locker de forma digital, asegurando la unicidad del número y la integridad de los datos.

### User Persona
*   **Nombre**: Alberto (Tesorero/Administrativo)
*   **Necesidad**: Registrar de forma sencilla un locker en el sistema. No se deben repetir números de locker.

### Criterios de Aceptación
- El sistema debe validar que no haya un locker con el mismo número.
- El locker debe quedar guardado con estado 'Available' por defecto.
- El atributo memberId es null al crearse el objeto.
- Al finalizar, el sistema debe mostrar un mensaje de éxito y limpiar el formulario.

## Diseño Técnico (RFC)

### Modelo de Datos
- `id`: Identificador único universal (UUID).
- `number`: Entero único.
- `location`: Cadena de texto.
- `status`: Enumeración (`Available`, `Occupied`, `Maintenance`).
- `memberId`: Clave foránea de Member y puede ser null.

### Contrato de API (@alentapp/shared)
*   **Endpoint**: `POST /api/v1/lockers`
*   **Request Body**: CreateLockerRequest
```ts
{
    number: number;
    location: string;
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
    - Valida `number` positivo, `location` obligatoria y unicidad del `number`.
    - Aplica los valores iniciales: `status: 'Available'` y `memberId: null`.
- Aplicacion
  - Caso de Uso
    - `CreateLockerUseCase`
  - Puertos
    - `ILockerRepository`
      - `create(locker)`
      - `findByNumber(number)`
  - DTOs (Van en el Shared ya que los usan tanto en back como el front)
    - `CreateLockerRequest`
    - `LockerResponse`
- Infraestructura
  - Adaptadores de Entrada
    - `LockerController`
    - `LockerRouter`
      - Registra el endpoint `POST /api/v1/lockers`.
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

| Escenario                          | Resultado Esperado                                       | Código HTTP               |
| ---------------------------------- | -------------------------------------------------------- | ------------------------- |
| Número de locker ya registrado     | `{ error: "Ya existe un locker con ese número" }`         | 409 Conflict              |
| Location vacía o inválida          | `{ error: "La ubicación es obligatoria" }`                | 400 Bad Request           |
| Number vacío                       | `{ error: "El numero es obligatorio" }`                   | 400 Bad Request           |
| Number invalido                    | `{ error: "El numero debe ser un entero positivo" }`      | 400 Bad Request           |  
| Error de conexión a DB             | `{ error: "Error interno, reintente más tarde" }`         | 500 Internal Server Error |

## Plan de Implementación

1. Definir esquema de persistencia y correr migración.
2. Crear tipos en `@alentapp/shared` y puerto `ILockerRepository` en el Dominio.
3. Implementar el repositorio y el caso de uso `CreateLocker`.
4. Crear el endpoint `POST /api/v1/lockers` en el `LockerController`, registrarlo en `LockerRouter` y montar el router en `app.ts` si aún no está montado.
5. Crear formulario en React y conectar con el endpoint del backend.
