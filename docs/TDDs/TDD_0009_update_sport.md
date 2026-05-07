---
id: 0009
estado: Propuesto
autor: Tomás Bellizzi
fecha: 2026-05-01
titulo: Modificación de Deportes Existentes (Sport)
---

# TDD-0009: Modificación de Deportes Existentes

## Contexto de Negocio (PRD)

### Objetivo
Permitir al personal administrativo actualizar los datos editables de un deporte ya registrado (descripción y capacidad máxima), respetando la inmutabilidad del nombre.

### User Persona
- **Nombre**: Administrador del Club
- **Necesidad**: Necesita poder ajustar la capacidad máxima de un deporte según disponibilidad de espacios, o actualizar la descripción para comunicar mejor la actividad a los socios. Su punto de dolor es no poder corregir información sin tener que eliminar y volver a crear el deporte.

### Criterios de Aceptación
- El sistema debe permitir modificar únicamente los campos `description`, `max_capacity` y `additional_price`, y `requires_medical_certificate`.
- El sistema **no debe permitir** modificar el campo `name`. Si se incluye en el body, debe ser ignorado o rechazado con un error explícito.
- El sistema debe validar que `additional_price`, si se informa, sea mayor o igual a cero.
- El sistema debe validar que `max_capacity`, si se incluye, siga siendo mayor a cero.
- Si el deporte no existe, el sistema debe retornar un error claro.
- El sistema debe retornar el recurso actualizado completo.

## Diseño Técnico (RFC)

### Modelo de Datos
Sin cambios en el schema. La operación es un `UPDATE` parcial sobre el registro `Sport`.

Campos editables:
- `description`: String, opcional.
- `max_capacity`: Int, debe ser > 0.
- `additional_price`: Float, opcional.
- `requires_medical_certificate`: Boolean.

Campo **inmutable** (no editable post-creación):
- `name`: String.

### Contrato de API (@alentapp/shared)

- **Endpoint**: `PATCH /api/v1/sports/:id`
- **Request Body**: (UpdateSportRequest)
- **Response Body**: 200 OK
```ts
{
  description?: string;
  max_capacity?: number;       // Entero > 0 si se especifica
  additional_price?: number;
  requires_medical_certificate?: boolean;
}
```

### Componentes de Arquitectura Hexagonal

- **Domain**: Entidad `Sport` con método `update(data: UpdateSportData)` que sólo aplica los campos permitidos. La inmutabilidad de `name` se garantiza en el dominio: el método `update` no expone ese campo.
- **Application**: Caso de Uso `UpdateSportUseCase`. Puerto de salida `ISportRepository` con método `update(id: string, data: UpdateSportData): Promise<Sport>` y `findById(id: string): Promise<Sport | null>`.
- **Infrastructure**: Controlador Fastify `SportController` (ruta PATCH). Implementación en `PrismaSportRepository`.

## Casos de Borde y Errores

| Escenario                               | Resultado Esperado                                              | Código HTTP       |
|-----------------------------------------|-----------------------------------------------------------------|-------------------|
| `id` no corresponde a ningún deporte    | Error con mensaje "Deporte no encontrado"                       | 404 Not Found     |
| Se intenta modificar `name`             | Error con mensaje "El nombre del deporte no puede modificarse"  | 400 Bad Request   |
| `max_capacity` es 0 o negativo          | Error de validación con mensaje descriptivo                     | 400 Bad Request   |
| `additional_price` negativo                | Mensaje: "El precio adicional no puede ser negativo"                       | 400 Bad Request           |
| Body vacío (sin campos a actualizar)    | Error de validación: se requiere al menos un campo              | 400 Bad Request   |
| Actualización exitosa                   | Retorna el deporte con los datos actualizados                   | 200 OK            |

## Plan de Implementación
1. Definir tipo `UpdateSportDto` en `@alentapp/shared` (sin el campo `name`).
2. Implementar el método `update` en la entidad `Sport` en el Domain, excluyendo `name`.
3. Añadir método `update` al puerto `ISportRepository` en Application.
4. Implementar `UpdateSportUseCase` en Application (buscar deporte, aplicar cambios, persistir).
5. Implementar el método `update` en `PrismaSportRepository` en Infrastructure.
6. Implementar la ruta `PATCH /api/v1/sports/:id` en el controlador Fastify.
7. Escribir tests unitarios para el caso de uso (deporte inexistente, intento de cambiar nombre, capacidad inválida, actualización válida).
8. Escribir tests de integración para el endpoint.
