---
id: 0013
estado: Propuesto
autor: Luca Giordani
fecha: 2026-05-01
titulo: Actualización de Sanción Disciplinaria
---

# TDD-0013: Actualización de Sanción Disciplinaria

## Contexto de Negocio (PRD)

### Objetivo

Permitir modificar sanciones existentes asegurando la integridad de las fechas y la consistencia de la información registrada.

### User Persona

* Nombre: Alberto (Administrativo Deportivo).
* Necesidad: Corregir errores en sanciones registradas sin generar inconsistencias.

### Criterios de Aceptación

* El sistema debe validar que la sanción exista.
* El sistema debe validar que la fecha de fin sea posterior a la fecha de inicio.
* Al finalizar, el sistema debe mostrar un mensaje de éxito.
* El sistema no debe permitir cambiar el `memberId` asociado.

## Diseño Técnico (RFC)

### Modelo de Datos

Se utilizará la entidad `Discipline` con las siguientes propiedades:

* `id`: Identificador único universal (UUID).
* `reason`: Cadena de texto.
* `startDate`: Fecha (datetime) de inicio.
* `endDate`: Fecha (datetime) de fin (debe ser posterior a `startDate`).
* `isTotalSuspension`: Booleano.
* `memberId`: UUID (clave foránea a Member).
* `deletedAt`: Fecha (datetime) de eliminación lógica. `null` indica que la sanción se encuentra activa en el sistema.
* `createdAt`: Fecha (datetime) de creación (autogenerada).
* `updatedAt`: Fecha (datetime) de última actualización (autogenerada).

### Contrato de API (@alentapp/shared)

Definiremos los tipos en el paquete compartido para asegurar sincronización:
**Éxito:** el cuerpo JSON usa `{ "data": ... }`. **Errores:** `{ "error": "<mensaje en español>" }`.

* Endpoint: `PUT /api/v1/disciplines/:id`
* Request Body (UpdateDisciplineRequest):

```ts
{
    reason?: string;
    startDate?: string; // ISO 8601 DateTime
    endDate?: string; // ISO 8601 DateTime
    isTotalSuspension?: boolean;
}
```
* Response 200 OK:

```ts
{
    data: {
        id: string;
        reason: string;
        startDate: string; // ISO 8601 DateTime
        endDate: string; // ISO 8601 DateTime
        isTotalSuspension: boolean;
        memberId: string;
        deletedAt: string | null;
        createdAt: string; // ISO 8601 DateTime
        updatedAt: string; // ISO 8601 DateTime
    }
}
```

Los campos omitidos conservarán su valor actual. El endpoint utilizará `PUT` para realizar actualizaciones parciales preservando los valores existentes no enviados en la request.

### Componentes de Arquitectura Hexagonal

1. Puerto: IDisciplineRepository (Interface del Dominio).
2. Caso de Uso: UpdateDisciplineUseCase (Lógica que valida existencia de la sanción y la coherencia del estado final de las fechas antes de persistir los cambios).
3. Adaptador de Salida: PostgresDisciplineRepository (Implementación real en BD con Prisma).
4. Adaptador de Entrada: DisciplineController (Ruta HTTP).

## Casos de Borde y Errores

| Escenario                   | Resultado Esperado                                               | Código HTTP               |
| -----------------------     | ------------------------------------------------------------     | ------------------------- |
| Sanción inexistente         | { "error": "La sanción no existe" }                              | 404 Not Found             |
| Body sin campos a actualizar| { "error": "Debe enviar al menos un campo a actualizar" }        | 400 Bad Request           |
| endDate ≤ startDate         | { "error": "La fecha de fin debe ser posterior a la de inicio" } | 400 Bad Request           |
| Datos inválidos             | { "error": "Formato de datos inválido" }                         | 400 Bad Request           |
| Error de conexión a DB      | { "error": "Error interno, reintente más tarde" }                | 500 Internal Server Error |
| deletedAt no null           | { "error": "No se puede editar una sanción desactivada" }        | 400 Bad Request           |

## Plan de Implementación

1. Crear lógica de búsqueda previa por ID.
2. Reconstruir el estado final de la entidad y validar la coherencia de las fechas antes de persistir los cambios.
3. Persistir cambios.
4. Conectar formulario de edición con backend.
