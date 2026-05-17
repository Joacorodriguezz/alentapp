---
id: 0011
estado: Propuesto
autor: Tomás Bellizzi
fecha: 2026-05-01
titulo: Consulta de Deporte (Sport)
---

# TDD-0011: Listado y Consultas de Deportes Existentes

## Contexto de Negocio (PRD)

### Objetivo
Permitir tanto al personal administrativo como a los socios consultar el catálogo de deportes disponibles en el club, ya sea listando todos los deportes o consultando el detalle de uno en particular.

### User Persona
- **Nombre**: Socio del Club / Administrador del Club
- **Necesidad**: El socio necesita conocer qué deportes ofrece el club, su capacidad y si requiere certificado médico, para decidir en cuál inscribirse. El administrador necesita ver el catálogo completo para gestionar la oferta. Su punto de dolor es no tener visibilidad clara de la oferta deportiva disponible.

### Criterios de Aceptación
- El sistema debe exponer un endpoint para listar todos los deportes registrados.
- El sistema debe exponer un endpoint para obtener el detalle de un deporte específico por su `id`.
- Si el deporte consultado por `id` no existe, el sistema debe retornar un error claro.
- La respuesta de listado debe incluir todos los campos relevantes de cada deporte.
- El listado debe poder filtrarse opcionalmente por `requiresMedicalCertificate`.

## Diseño Técnico (RFC)

### Modelo de Datos
Sin cambios en el schema. Operaciones de sólo lectura sobre el modelo `Sport`.

### Contrato de API (@alentapp/shared)

**Endpoint 1 — Listar todos los deportes:**
- **Endpoint**: `GET /api/v1/sports`
- **Query Params opcionales**:
```ts
{
  requiresMedicalCertificate?: boolean;
}
```
- **Response Body (200 OK)**:
```tsx
{ "data": 
  {
    Array<{
      id: string;
      name: string;
      description: string | null;
      maxCapacity: number;
      additionalPrice: number | null;
      requiresMedicalCertificate: boolean;
    }>
  }
}

```

**Endpoint 2 — Obtener un deporte por ID:**
- **Endpoint**: `GET /api/v1/sports/:id`
- **Response Body (200 OK)**:
```ts
{
  id: string;
  name: string;
  description: string | null;
  maxCapacity: number;
  additionalPrice: number | null;
  requiresMedicalCertificate: boolean;
}
```

### Componentes de Arquitectura Hexagonal

- **Domain**:
  - Entidad `Sport` (ya definida). Sin lógica de negocio adicional para consultas.
- **Application**:
  - Casos de uso `GetAllSportsUseCase` y `GetSportByIdUseCase`.
  - Puerto de salida `ISportRepository` con métodos `findAll(filters?: SportFilters): Promise<Sport[]>` y `findById(id: string): Promise<Sport | null>`.
  - DTOs en Shared: `SportResponse` y `SportFilters`.
- **Infrastructure**:
  - `SportController`: recibe los requests HTTP y los delega a los casos de uso correspondientes.
  - `SportRouter`: registra las rutas `GET /api/v1/sports` y `GET /api/v1/sports/:id` y las conecta al controlador.
  - `PostgresSportRepository`: implementación del puerto `ISportRepository`.
  - `SportPersistenceMapper`: convierte entre la entidad de dominio `Sport` y el modelo de Prisma (`toPersistence`, `toDomain`).
  - `SportDTOMapper`: convierte la entidad de dominio a `SportResponse` (`toDTO`).

## Casos de Borde y Errores

| Escenario                                     | Resultado Esperado                                     | Código HTTP       |
|-----------------------------------------------|--------------------------------------------------------|-------------------|
| No hay deportes registrados (listado vacío)   | Retorna un array vacío `[]`                            | 200 OK            |
| `id` no corresponde a ningún deporte          | { "error": "Deporte no encontrado" }                   | 404 Not Found     |
| `id` con formato inválido (no UUID)           | { "error": "Identificador de deporte inválido" }       | 400 Bad Request   |
| Filtro `requiresMedicalCertificate=true`      | Retorna sólo los deportes con ese atributo en `true`   | 200 OK            |
| Listado con múltiples deportes                | Retorna el array completo con todos los deportes       | 200 OK            |

## Plan de Implementación
1. Definir tipos `SportResponse` y `SportFilters` en Shared (`@alentapp/shared`).
2. Añadir métodos `findAll` y `findById` al puerto `ISportRepository` en Application.
3. Implementar `GetAllSportsUseCase` y `GetSportByIdUseCase` en Application.
4. Implementar `SportPersistenceMapper` con los métodos `toPersistence` y `toDomain`.
5. Implementar `SportDTOMapper` con el método `toDTO`.
6. Implementar los métodos de lectura en `PrismaSportRepository` en Infrastructure.
7. Implementar `SportController` en Infrastructure.
8. Implementar `SportRouter` y registrarlo en la aplicación.
9. Escribir tests unitarios para ambos casos de uso.
10. Escribir tests de integración para ambos endpoints.