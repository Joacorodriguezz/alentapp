---
id: 0018
estado: Propuesto
autor: Facundo Devida
fecha: 2026-05-02
titulo: Eliminacion de Prestamo de equipamiento
---

# TDD-0018: Eliminacion de Prestamo de equipamiento

## Contexto de Negocio (PRD)

### Objetivo

Permitir la anulación o baja lógica de un registro de préstamo para mantener la limpieza del sistema frente a errores de carga garantizando al mismo tiempo que no se pierda la trazabilidad histórica y de auditoría.

### User Persona

- **Nombre**: Administrativo
- **Necesidad**: Poder dar de baja rápidamente préstamos que fueron cargados por duplicado, asignados al socio equivocado por error de tipeo, o cancelados por el socio antes de retirar físicamente el material. El administrativo necesita que esta eliminación sea segura (lógica) para evitar la pérdida permanente de información en caso de un clic accidental.

### Criterios de Aceptación

- Si se intenta eliminar un prestamo que no existe en el sistema o que ya fue eliminado logicamente, el sistema debe devolver un error indicando que el recurso no fue encontrado
- Al ejecutar la eliminacion el sistema no debe borrar fisicamente el registo de la base de datos, sino que debe registrar la fecha y hora de la operacion en el campo `deletedAt`.
- Una vez que un préstamo ha sido dado de baja (posee un valor en `deletedAt`), el sistema debe ocultarlo de los listados generales y bloquear cualquier intento de actualización
- Al finalizar, el sistema debe mostrar un mensaje de exito confirmando la baja logica.

## Diseño Técnico (RFC)

### Contrato de API (@alentapp/shared)

- **Endpoint**: `DELETE /api/v1/equipment-loans/:id`
- **Request Body**:`none`

- **Response 200 OK**:

```tsx
{
"data": {
        "id": "123"
    }
}
```

### Componentes de Arquitectura Hexagonal

- **Domain**:
    - La estructura de la entidad `EquipmentLoan` y el Value Object `EquipmentLoanStatus` son idénticos a los definidos en el documento base de creación.
    - Comportamiento: La entidad `EquipmentLoan` es responsable de gestionar su propia baja. Posee un comportamiento interno que asienta la fecha actual en `deletedAt` y valida que no se pueda eliminar si ya estaba eliminado.
- **Application**:
    - Caso de Uso: `DeleteEquipmentLoanUseCase` (Busca el prestamo validando su existencia, delega a la entidad el cambio del campo `deletedAt` de `null` a la fecha de eliminacion y persiste la entidad modificada utilizando `IEquipmentLoanRepository`)
    - Puertos de Salida: `IEquipmentLoanRepository` (Interface de dominio, de la cual necesitamos el metodo `findById()` y `update()` para registrar la fecha y hora de la eliminacion)
- **Infrastructure**:
    - Adaptadores de entrada: `EquipmentLoanController` utilizando su ruta `DELETE /api/v1/equipment-loans/:id` y `EquipmentLoanRouter`
    - Adaptadores de salida: DB persistence adapter (Se reutiliza la implementacion definida en el Alta)
    - Mappers: `EquipmentLoanPersistenceMapper` con los metodos `ToPersistence` y `ToDomain`.Tambien `EquipmentLoanDTOMapper`con el metodo `ToDTO`.

## Casos de Borde y Errores

| **Escenario** | **Resultado Esperado** | **Código HTTP** |
| :--- | :--- | :--- |
| **Préstamo inexistente (ID no existe)** | `{ "error": "El préstamo que intenta eliminar no se encuentra registrado." }` | 404 Not Found |
| **Préstamo ya eliminado previamente** | `{ "error": "El préstamo que intenta eliminar no se encuentra registrado." }` | 404 Not Found |
| **Formato de ID inválido** | `{ "error": "El formato del ID provisto en la URL no es válido." }` | 400 Bad Request |
| **Error de conexión a DB** | `{ "error": "Error interno del servidor al procesar la baja, reintente más tarde." }` | 500 Internal Server Error |

## Plan de Implementación

---

## Fase 1: Núcleo de Dominio (Domain)
1. **Comportamiento en la Entidad `EquipmentLoan`**:
   - Implementar método `delete()`: 
     - Validar que `deletedAt` sea actualmente `null`. Si ya tiene una fecha, lanzar una excepción de negocio.
     - Asignar la fecha y hora actual al campo `deletedAt`.
2. **Puertos (Interfaces)**: Verificar que `IEquipmentLoanRepository` disponga de:
   - `findById()`: Para recuperar el préstamo antes de marcarlo.
   - `update()`: Para persistir el cambio de estado en la base de datos.

---

## Fase 2: Lógica de Aplicación (Application)
3. **Desarrollar `DeleteEquipmentLoanUseCase`**:
   - **Flujo de orquestación**:
     1. Solicitar el préstamo al repositorio.
     2. Si no se encuentra, lanzar una excepción.
     3. Llamar al método `delete()` de la entidad.
     4. Persistir la entidad modificada a través del método `update()` del repositorio.

---

## Fase 3: Infraestructura y Persistencia (Infrastructure)
4. **Actualizar el `DB persistence adapter`**:
   - **Filtrado Crítico**: Modificar las consultas de lectura (`findAll` y `findById`) para incluir la cláusula que excluya registros donde `deletedAt` no sea nulo.
5. **Adaptadores de Entrada**:
   - Agregar en `EquipmentLoanController` el método vinculado a `DELETE /api/v1/equipment-loans/:id`.