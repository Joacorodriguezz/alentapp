---
id: 0008
estado: Propuesto
autor: Tomás Bellizzi
fecha: 2026-05-01
titulo: Registro de Nuevo Deporte (Sport)
---

# TDD-0008: Alta de Deporte

## Contexto de Negocio (PRD)

### Objetivo
Permitir al personal administrativo del club registrar un nuevo deporte en el sistema, de manera que pueda ser ofrecido a los socios como actividad disponible para inscripción.

### User Persona
- **Nombre**: Administrador del Club
- **Necesidad**: Necesita poder dar de alta nuevos deportes con su capacidad máxima, precio adicional y descripción, para mantener actualizado el catálogo de actividades del club. Su punto de dolor principal es no tener una forma centralizada de gestionar la oferta deportiva.

### Criterios de Aceptación
- El sistema debe validar que el campo `name` es único; no se puede registrar un deporte con un nombre ya existente.
<<<<<<< HEAD
- El sistema debe validar que `max_capacity` es un número entero estrictamente mayor a cero.
- El sistema debe validar que `additional_price`, si se informa, no sea negativo.
=======
- El sistema debe validar que `maxCapacity` es un número entero estrictamente mayor a cero.
- El sistema debe validar que `additionalPrice` sea mayor o igual a cero.
>>>>>>> bab22d4484d68621000b6754b90ce417cdb959cd
- El sistema debe persistir el nuevo deporte con todos sus campos y retornar el recurso creado con su `id` generado.
- El campo `name` queda inmutable luego de la creación; solo se puede establecer en el alta.
- El campo `requiresMedicalCertificate` debe tener un valor por defecto (`false`) si no se especifica.

## Diseño Técnico (RFC)

### Modelo de Datos
Sin cambios en el schema existente. Se utiliza el modelo `Sport` ya definido en Prisma:

- `id`: String, UUID, PK, generado automáticamente.
- `name`: String, UNIQUE. Inmutable post-creación.
- `description`: String, opcional.
- `maxCapacity`: Int. Debe ser > 0.
- `additionalPrice`: Float, opcional.
- `requiresMedicalCertificate`: Boolean, default `false`.

### Contrato de API (@alentapp/shared)

- **Endpoint**: `POST /api/v1/sports`
- **Request Body** (CreateSportRequest):
```tsx
{
  name: string;                            // Único
  description?: string;
  maxCapacity: number;                    // Entero > 0
  additionalPrice?: number;               // >= 0 si se especifica
  requiresMedicalCertificate?: boolean;  // default false
}
```
- **Response Body** (201 Created):
```tsx
{ "data" : 
  {
    id: string;
    name: string;
    description: string | null;
    maxCapacity: number;
    additionalPrice: number | null;
    requiresMedicalCertificate: boolean;
  }
}
```

### Componentes de Arquitectura Hexagonal

- **Domain**:
  - Entidad `Sport`.
  - La entidad `Sport` valida internamente que `max_capacity` sea mayor a cero.
  - Regla de negocio: `name` es inmutable (se valida al construir la entidad, no se expone setter).
- **Application**:
  - Caso de Uso `CreateSportUseCase`.
  - Puerto de salida `ISportRepository` con métodos `create(sport: Sport): Promise<Sport>` y `findByName(name: string): Promise<Sport | null>`.
  - DTOs en Shared: `CreateSportRequest` y `SportResponse`.
- **Infrastructure**:
  - `SportController`: recibe el request HTTP y lo delega al caso de uso.
  - `SportRouter`: registra la ruta `POST /api/v1/sports` y la conecta al controlador.
  - `PrismaSportRepository`: implementación del puerto `ISportRepository`.
  - `SportPersistenceMapper`: convierte entre la entidad de dominio `Sport` y el modelo de Prisma (`toPersistence`, `toDomain`).
  - `SportDTOMapper`: convierte la entidad de dominio a `SportResponse` (`toDTO`).

## Casos de Borde y Errores

<<<<<<< HEAD
| Escenario                        | Resultado Esperado                                      | Código HTTP              |
|----------------------------------|---------------------------------------------------------|--------------------------|
| `name` ya registrado             | Mensaje: "El deporte ya existe"                         | 409 Conflict             |
| `max_capacity` es 0 o negativo   | Mensaje: "La capacidad maxima debe ser mayor a cero"    | 400 Bad Request          |
| `max_capacity` no es entero      | Mensaje: "La capacidad maxima debe ser un numero entero"| 400 Bad Request          |
| `aditional_price` es negativo    | Mensaje: "El precio adicional no puede ser negativo"    | 400 Bad Request          |
| `name` ausente en el body        | Mensaje: "El nombre del deporte es obligatorio"         | 400 Bad Request          |
| Error Conexion a BD              | Mensaje: "Error interno, reintente mas tarde"           | 500 Internal Server Error|
=======
| Escenario                        | Resultado Esperado                                      | Código HTTP       |
|------------------------------------------|---------------------------------------------------------|-------------------|
| `name` ya registrado                     | { "error": "El deporte ya existe" }                         | 409 Conflict      |
| `maxCapacity` es 0 o negativo           | { "error": "La capacidad máxima debe ser mayor a cero" }    | 400 Bad Request   |
| `maxCapacity` no es entero              | { "error": "La capacidad máxima debe ser un numero entero" }| 400 Bad Request   |
| `additionalPrice` no puede ser negativo | { "error": "El precio adicional no puede ser negativo" } | 400 Bad Request   |
| `name` ausente en el body                | { "error": "El nombre del deporte es obligatorio" }         | 400 Bad Request   |
| Body vacío                               | Error de validación: campos requeridos faltantes        | 400 Bad Request   |

>>>>>>> bab22d4484d68621000b6754b90ce417cdb959cd

## Plan de Implementación
1. Definir tipos `CreateSportRequest` y `SportResponse` en Shared (`@alentapp/shared`).
2. Implementar la entidad `Sport` en el Domain con la validación de `max_capacity > 0`.
3. Definir el puerto `ISportRepository` en Application.
4. Implementar `CreateSportUseCase` en Application (validar unicidad de nombre, construir entidad, persistir).
5. Implementar `SportPersistenceMapper` con los métodos `toPersistence` y `toDomain`.
6. Implementar `SportDTOMapper` con el método `toDTO`.
7. Implementar `PrismaSportRepository` en Infrastructure.
8. Implementar `SportController` en Infrastructure.
9. Implementar `SportRouter` y registrarlo en la aplicación.
10. Escribir tests unitarios para el caso de uso y el Value Object.
11. Escribir tests de integración para el endpoint. 