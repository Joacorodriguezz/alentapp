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
- El sistema debe validar que `max_capacity` es un número entero estrictamente mayor a cero.
- El sistema debe validar que `additional_price`, si se informa, no sea negativo.
- El sistema debe persistir el nuevo deporte con todos sus campos y retornar el recurso creado con su `id` generado.
- El campo `name` queda inmutable luego de la creación; solo se puede establecer en el alta.
- El campo `requires_medical_certificate` debe tener un valor por defecto (`false`) si no se especifica.

## Diseño Técnico (RFC)

### Modelo de Datos
Sin cambios en el schema existente. Se utiliza el modelo `Sport` ya definido en Prisma:

- `id`: String, UUID, PK, generado automáticamente.
- `name`: String, UNIQUE. Inmutable post-creación.
- `description`: String, opcional.
- `max_capacity`: Int. Debe ser > 0.
- `additional_price`: Float, opcional.
- `requires_medical_certificate`: Boolean, default `false`.

### Contrato de API (@alentapp/shared)

- **Endpoint**: `POST /api/v1/sports`
- **Request Body**: (CreateSportRequest)
- **Response Body**: 201 Created
```ts
{
  name: string;               // Único
  description?: string;       
  max_capacity: number;       // Entero > 0
  additional_price?: number;  
  requires_medical_certificate?: boolean; // default false
}
```

### Componentes de Arquitectura Hexagonal

- **Domain**: Entidad `Sport`. Value Object `MaxCapacity` que encapsula la validación de capacidad > 0. Regla de negocio: `name` es inmutable (se valida al construir la entidad, no se expone setter).
- **Application**: Caso de Uso `CreateSportUseCase`. Puerto de salida `ISportRepository` con método `create(sport: Sport): Promise<Sport>` y `findByName(name: string): Promise<Sport | null>`.
- **Infrastructure**: Controlador Fastify `SportController` (ruta POST). Implementación del repositorio `PrismaSportRepository`.

## Casos de Borde y Errores

| Escenario                        | Resultado Esperado                                      | Código HTTP              |
|----------------------------------|---------------------------------------------------------|--------------------------|
| `name` ya registrado             | Mensaje: "El deporte ya existe"                         | 409 Conflict             |
| `max_capacity` es 0 o negativo   | Mensaje: "La capacidad maxima debe ser mayor a cero"    | 400 Bad Request          |
| `max_capacity` no es entero      | Mensaje: "La capacidad maxima debe ser un numero entero"| 400 Bad Request          |
| `aditional_price` es negativo    | Mensaje: "El precio adicional no puede ser negativo"    | 400 Bad Request          |
| `name` ausente en el body        | Mensaje: "El nombre del deporte es obligatorio"         | 400 Bad Request          |
| Error Conexion a BD              | Mensaje: "Error interno, reintente mas tarde"           | 500 Internal Server Error|

## Plan de Implementación
1. Definir tipos `CreateSportDto` y `SportResponseDto` en `@alentapp/shared`.
2. Implementar el Value Object `MaxCapacity` en el Domain con su validación.
3. Implementar la entidad `Sport` en el Domain.
4. Definir el puerto `ISportRepository` en Application.
5. Implementar `CreateSportUseCase` en Application (validar unicidad de nombre, construir entidad, persistir).
6. Implementar `PrismaSportRepository` en Infrastructure.
7. Implementar el controlador Fastify para la ruta `POST /api/v1/sports`.
8. Registrar la ruta en el servidor Fastify.
9. Escribir tests unitarios para el caso de uso y el Value Object.
10. Escribir tests de integración para el endpoint.
