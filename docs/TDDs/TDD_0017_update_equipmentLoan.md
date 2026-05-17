---
id: 0017
estado: Propuesto
autor: Facundo Devida
fecha: 2026-05-02
titulo: Actualizacion de Prestamo de equipamiento existente
---
# TDD-0017: Actualizacion de Prestamos de equipamiento existente

## Contexto de Negocio (PRD)

### Objetivo

Permitir la actualizacion de los detalles del prestamo de equipamiento para que se refleje con certeza la realidad fisica del equipamiento

### User Persona

- **Nombre**: Administrativo
- **Necesidad**: Registrar rapidamente cuando un socio devuelve el material para asentar si el equipo fue devuelto con daños para asi reponerlo, o corregir un prestamo existente por algun error de tipeo cometido al momento de la creacion

### Criterios de Aceptación

- El sistema debe validar que la nueva fecha ingresada sea futura a la fecha de prestamo
- El sistema debe permitir cambiar el estado de `Loaned` a `Returned` o `Damaged` para finalizar el préstamo
- Si un prestamo ya se encuentra finalizado (`Returned` o `Damaged`), el sistema debe permitir alternar entre estos para corregir errores de carga manual
- El sistema no debe permitir que un prestamo con estado `Returned` o `Damaged` vuelva al estado inicial `Loaned` para prevenir inconsistencias en los datos de la entidad. Si un socio quiere el material nuevamente se debe generar un nuevo prestamo.
- Una vez que el préstamo pasa a un estado final (`Returned` o `Damaged`), el sistema debe bloquear la edición de los campos `itemName` y `dueDate`. Solo se permitirá modificar el campo `status` para correcciones.
- Al finalizar, el sistema debe mostrar un mensaje de exito y retornar los datos actualizados

## Diseño Técnico (RFC)

### Contrato de API (@alentapp/shared)

- **Endpoint**: `PATCH /api/v1/equipment-loans/:id`
- **Request Body**:

```tsx
{
    itemName?: string;
    dueDate?: string;
    status?: 'Loaned' | 'Returned' | 'Damaged';
}
```

- **Response 200 OK**:

```tsx
{
"data": {
        "id": "123",
        "itemName": "Pelota de Fútbol N5 (Actualizado)",
        "dueDate": "2026-05-25T18:00:00Z",
        "memberId": "mem-123",
        "status": "Devuelto",
        "loanDate": "2026-05-16T15:30:00Z"
    } 
}
```

### Componentes de Arquitectura Hexagonal

- **Domain**:
    - La estructura de la entidad `EquipmentLoan` y el Value Object `EquipmentLoanStatus` son idénticos a los definidos en el documento base de creación
    - Reglas de Negocio(Transicion de estados): Solo permitir cambiar el estado de `Loaned` a `Returned` o `Damaged`y transicionar entre estos ultimos dos. Bloquear el retorno a `Loaned` y congelar la edición de los campos `itemName` y `dueDate` si el préstamo ya está finalizado(`Returned` o `Damaged`)."
- **Application**:
    - Caso de Uso: `UpdateEquipmentLoanUseCase` (Busca el prestamo existente, llama a `EquipmentLoan` para que aplique sus reglas de transicion de estados, bloquea los campos correspondientes si es necesario y persiste la entidad modificada utilizando `IEquipmentLoanRepository`)
    - Puertos de Salida: `IEquipmentLoanRepository` (Interface de dominio, de la cual necesitamos el metodo `findById()` y `update()`)
    - DTOs: `UpdateEquipmentLoanRequest` y `EquipmentLoanResponse`(Estos estaran situados en la carpeta @alentapp/shared)
- **Infrastructure**:
    - Adaptadores de entrada: `EquipmentLoanController` utilizando su ruta `PATCH /api/v1/equipment-loans/:id` y `EquipmentLoanRouter`
    - Adaptadores de salida: DB persistence adaptor (Se reutiliza la implementacion definida en el Alta)
    - Mappers: `EquipmentLoanPersistenceMapper` con los metodos `ToPersistence` y `ToDomain`.Tambien `EquipmentLoanDTOMapper`con el metodo `ToDTO`.

## Casos de Borde y Errores

| **Escenario** | **Resultado Esperado** | **Código HTTP** |
| :--- | :--- | :--- |
| **Préstamo inexistente o eliminado** | `{ "error": "El préstamo que intenta actualizar no existe en el sistema." }` | 404 Not Found |
| **Regresión de estado prohibida** | `{ "error": "No se puede cambiar el estado a 'Prestado' si el préstamo ya fue finalizado." }` | 409 Conflict |
| **Edición de histórico bloqueada** | `{ "error": "No se pueden modificar datos (itemName, dueDate) de un préstamo ya cerrado." }` | 409 Conflict |
| **Nueva fecha en el pasado** | `{ "error": "La nueva fecha de devolución debe ser posterior a la fecha actual." }` | 400 Bad Request |
| **Formato de ID inválido** | `{ "error": "El parámetro ID de la URL no tiene un formato válido." }` | 400 Bad Request |
| **Error de conexión a DB** | `{ "error": "Error interno del servidor, reintente más tarde." }` | 500 Internal Server Error |

## Plan de Implementación

---

## Fase 1: Contratos Shared (`@alentapp/shared`)
1. **Actualizar DTOs**: Crear y exportar `UpdateEquipmentLoanRequest`.

---

## Fase 2: Núcleo de Dominio (Domain)
2. **Comportamiento en la Entidad `EquipmentLoan`**:
   - Implementar método para actualizar la informacion: Debe lanzar un error de negocio si el estado actual ya es `Returned` o `Damaged` (campos congelados).
   - Implementar método para cambiar el estado: Validar que solo se permita pasar de `Loaned` a `Returned`/`Damaged`. Bloquear cualquier intento de volver a `Loaned`.
3. **Puertos (Interfaces)**: Asegurar que `IEquipmentLoanRepository` incluya:
   - `findById()`: Para recuperar la versión actual de la base de datos.
   - `update()`: Para persistir los cambios en el registro existente.

---

## Fase 3: Lógica de Aplicación (Application)
4. **Desarrollar `UpdateEquipmentLoanUseCase`**:
   - **Flujo de orquestación**:
     1. Obtener la entidad actual desde `IEquipmentLoanRepository`.
     2. Si no existe, lanzar excepción de negocio.
     3. Ejecutar los métodos de comportamiento de la entidad con los datos del Request.
     4. Persistir la entidad modificada mediante el método `update()` del repositorio.

---

## Fase 4: Infraestructura y Mapeo (Infrastructure)
5. **Adaptadores de Salida**:
   - Implementar en el `DB persistence adapter` la lógica para buscar por ID y realizar el `UPDATE` real en la base de datos.
   - Asegurar que el `EquipmentLoanPersistenceMapper` procese correctamente los cambios de estado y fechas.
6. **Adaptadores de Entrada**:
   - Implementar en `EquipmentLoanController` el método vinculado a `PATCH /api/v1/equipment-loans/:id`.