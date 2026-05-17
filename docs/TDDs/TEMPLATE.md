---
autor: [Nombre]
fecha: [AAAA-MM-DD]
titulo: [Nombre de la Funcionalidad]
---

# TDD-[XXXX]: [Nombre de la Funcionalidad]

## Contexto de Negocio (PRD)

### Objetivo
[Descripción del valor de negocio y qué problema resuelve.]

### User Persona
*   **Nombre**: [Nombre del rol/persona]
*   **Necesidad**: [Descripción de lo que necesita lograr y sus puntos de dolor.]

### Criterios de Aceptación
*   [Criterio 1: ej. El sistema debe validar que...]
*   [Criterio 2: ej. Al finalizar, el sistema debe...]
*   [Criterio 3: ej. El estado por defecto debe ser...]

## Diseño Técnico (RFC)

### Modelo de Datos
[Descripción de cambios en Prisma o nuevas entidades.]
*   `campo`: Tipo (Restricciones).

### Contrato de API (@alentapp/shared)
[Definición de endpoints y tipos compartidos.]
*   **Endpoint**: `METHOD /api/v1/[recurso]`
*   **Request Body**:
```ts
{
    // propiedades
}
```

### Componentes de Arquitectura Hexagonal
[Cómo se distribuye la lógica en las capas.]
*   **Domain**: [Entidades, Value Objects, Reglas de negocio]
*   **Application**: [Casos de Uso, Puertos de Salida]
*   **Infrastructure**: [Adaptadores, Controladores, Implementación de Repositorios]

## Casos de Borde y Errores
| Escenario                   | Resultado Esperado                            | Código HTTP               |
| ----------------------------| --------------------------------------------- | ------------------------- |
| [Ej: DNI ya registrado]     | [Error de validación con mensaje claro]       | 409 Conflict              |
| [Ej: Formato email inválido]| [Error de validación de formato]              | 400 Bad Request           |

## Plan de Implementación
1. [Paso 1: ej. Definir tipos en @alentapp/shared]
2. [Paso 2: ej. Implementar entidad en Domain]