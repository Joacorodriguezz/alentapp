---
id: 0010
estado: Propuesto
autor: Tomás Bellizzi
fecha: 2026-05-01
titulo: Baja de Deporte Existente (Sport)
---

# TDD-0010: Baja de Deporte Existente 

## Contexto de Negocio (PRD)

### Objetivo
Permitir al personal administrativo eliminar un deporte del catálogo del club cuando este deja de ofrecerse, asegurando la integridad referencial con las inscripciones y disciplinas asociadas.

### User Persona
- **Nombre**: Administrador del Club
- **Necesidad**: Necesita poder eliminar deportes que ya no se ofrecen en el club, para mantener el catálogo limpio y actualizado. Su punto de dolor es tener deportes obsoletos que confunden a los socios al momento de inscribirse.

### Criterios de Aceptación
- El sistema debe eliminar el deporte identificado por su `id`.
- Si el deporte no existe, el sistema debe retornar un error claro.
- El sistema debe verificar que no existan inscripciones (`Enrollment`) activas asociadas al deporte antes de eliminarlo, para preservar la integridad de los datos.
- La operación debe retornar una confirmación de eliminación exitosa.

## Diseño Técnico (RFC)

### Modelo de Datos
Sin cambios en el schema. La operación es un borrado físico (`DELETE`) del registro `Sport` identificado por su `id`, siempre que no tenga relaciones activas que lo impidan.

### Contrato de API (@alentapp/shared)

- **Endpoint**: `DELETE /api/v1/sports/:id`
- **Request Body**: None
- **Response Body**: 204 No content (en caso de exito)

### Componentes de Arquitectura Hexagonal

- **Domain**:
  - Entidad `Sport`.
  - `SportDomainService`: encapsula la lógica de negocio que involucra múltiples entidades; valida que no existan `Enrollment` activos asociados al deporte antes de permitir su eliminación.
- **Application**:
  - Caso de Uso `DeleteSportUseCase`: orquesta la operación llamando al `SportDomainService` y delegando la eliminación al repositorio.
  - Puerto de salida `ISportRepository` con métodos `findById(id: string): Promise<Sport | null>` y `delete(id: string): Promise<void>`.
  - Puerto de salida `IEnrollmentRepository` con método `hasActiveEnrollmentsBySport(sportId: string): Promise<boolean>`.
- **Infrastructure**:
  - `SportController`: recibe el request HTTP y lo delega al caso de uso.
  - `SportRouter`: registra la ruta `DELETE /api/v1/sports/:id` y la conecta al controlador.
  - `PostgresSportRepository`: implementación del puerto `ISportRepository`.
  - `PostgresEnrollmentRepository`: implementación del puerto `IEnrollmentRepository`.
  - `SportPersistenceMapper`: convierte entre la entidad de dominio `Sport` y el modelo de Prisma (`toPersistence`, `toDomain`).

## Casos de Borde y Errores

| Escenario                                  | Resultado Esperado                                                      | Código HTTP       |
|--------------------------------------------|-------------------------------------------------------------------------|-------------------|
| `id` no corresponde a ningún deporte       | { "error": "Deporte no encontrado" }                                    | 404 Not Found     |
| Deporte con inscripciones activas          | { "error": "No se puede eliminar: existen inscripciones activas" }      | 409 Conflict      |
| `id` con formato inválido (no UUID)        | { "error": "Identificador de deporte inválido" }                        | 400 Bad Request   |
| Eliminación exitosa                        | Respuesta vacía                                                         | 204 No Content    |


## Plan de Implementación
1. Implementar `SportDomainService` en Domain con la validación de Enrollments activos.
2. Añadir métodos `findById` y `delete` al puerto `ISportRepository` en Application.
3. Añadir método `hasActiveEnrollmentsBySport` al puerto `IEnrollmentRepository` en Application.
4. Implementar `DeleteSportUseCase` en Application (buscar deporte, invocar `SportDomainService`, eliminar).
5. Implementar `SportPersistenceMapper` con los métodos `toPersistence` y `toDomain`.
6. Implementar los métodos de borrado en `PrismaSportRepository` y `PrismaEnrollmentRepository`.
7. Implementar `SportController` en Infrastructure.
8. Implementar `SportRouter` y registrarlo en la aplicación.
9. Escribir tests unitarios para el caso de uso (deporte inexistente, con inscripciones activas, sin inscripciones).
10. Escribir tests de integración para el endpoint.