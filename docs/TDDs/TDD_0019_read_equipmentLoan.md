---
id: 0019
estado: Propuesto
autor: Facundo Devida
fecha: 2026-05-02
titulo: Consultas y Listado de Préstamos
---

# TDD-0019: Consultas y Listado de Préstamos

## Contexto de Negocio (PRD)

### Objetivo

Permitir la visualización y auditoría de los préstamos registrados en el sistema, asegurando que el personal pueda consultar el estado del inventario prestado en tiempo real

### User Persona

- **Nombre**: Administrativo
- **Necesidad**: Consultar rápidamente el listado general de préstamos para saber qué materiales están fuera del club y cuándo deben regresar, así como acceder al detalle de un préstamo específico para revisar a qué socio corresponde o en qué estado se encuentra.

### Criterios de Aceptación

- El sistema debe omitir de los listados y consultas cualquier préstamo que haya sido eliminado lógicamente.
- El endpoint de listado debe devolver la colección de todos los préstamos activos o históricos válidos. Si no existe ningún registro, debe devolver una lista vacía sin arrojar error.
- El endpoint de detalle debe devolver la información completa y formateada de un único préstamo correspondiente al ID solicitado.

## Diseño Técnico (RFC)

### Contrato de API (@alentapp/shared)

**Endpoint 1: Listado General**

- **Endpoint:** `GET /api/v1/equipment-loans`
- **Request Body: `none`**
- **Response:** `EquipmentLoanResponse[]`.

**Endpoint 2: Detalle por ID**

- **Endpoint:** `GET /api/v1/equipment-loans/:id`
- **Request Body:** `none`
- **Response:** `EquipmentLoanResponse`

### Componentes de Arquitectura Hexagonal

- **Domain**:
    - La estructura de la entidad `EquipmentLoan` y el Value Object `EquipmentLoanStatus` son idénticos a los definidos en el documento base de creación.
- **Application**: 
    - Se definen dos casos de uso simples: `GetAllEquipmentLoansUseCase` y `GetEquipmentLoanByIdUseCase`. Su función es orquestar la llamada al repositorio.
    - Puertos de Salida: Interfaz `IEquipmentLoanRepository`. Se requieren los métodos `findAll()` y `findById()`().
- **Infrastructure**:
    - Adaptadores de entrada: `EquipmentLoanController` exponiendo las rutas `GET /api/v1/equipment-loans` y `GET /api/v1/equipment-loans/:id` y `EquipmentLoanRouter`.
    - Adaptadores de salida: DB persistence adapter (Se reutiliza la implementacion definida en el Alta)(Este debe implementar una validacion de no devolver registros borrados)
    - Mappers: `EquipmentLoanPersistenceMapper` con los metodos `ToPersistence` y `ToDomain`.Tambien `EquipmentLoanDTOMapper`con el metodo `ToDTO`.

## Casos de Borde y Errores

| **Escenario** | **Resultado Esperado** | **Código HTTP** |
| :--- | :--- | :--- |
| **Búsqueda por ID inexistente** | `{ "error": "El préstamo solicitado no fue encontrado." }` | 404 Not Found |
| **Búsqueda de un ID eliminado lógicamente** | `{ "error": "El préstamo solicitado no fue encontrado." }` | 404 Not Found |
| **Listado general sin registros en la DB** | `{ "data": [] }` | 200 OK |
| **Formato de ID inválido en la URL** | `{ "error": "El formato del ID provisto en la URL no es válido." }` | 400 Bad Request |
| **Error de conexión a DB** | `{ "error": "Error interno del servidor, reintente más tarde." }` | 500 Internal Server Error |

## Plan de Implementación

---

## Fase 1: Contratos Shared (`@alentapp/shared`)

1. **Definir DTO de Salida**: Validar que exista `EquipmentLoanResponse`.

---

## Fase 2: Puertos y Dominio (Domain)

2. **Puertos (Interfaces)**: Asegurar que `IEquipmentLoanRepository` disponga de los métodos de consulta:
   - `findAll()`: Para obtener la colección de préstamos activos.
   - `findById(id: string)`: Para obtener un préstamo específico por su ID único.

---

## Fase 3: Lógica de Aplicación (Application)

3. **Desarrollar Casos de Uso**:
   - **`GetAllEquipmentLoansUseCase`**:
     1. Solicitar al repositorio la lista de entidades.
     2. Retornar la lista (aunque esté vacía) a la capa de infraestructura.
   - **`GetEquipmentLoanByIdUseCase`**:
     1. Solicitar la entidad al repositorio mediante su ID.
     2. Si el repositorio devuelve `null` (ya sea porque no existe o fue borrado lógicamente), lanzar una excepción de negocio.
     3. Retornar la entidad de dominio.

---

## Fase 4: Infraestructura y Persistencia (Infrastructure)

4. **Adaptador de Persistencia (Salida)**:
   - **Filtro de Seguridad**: Implementar `findAll` y `findById` en el `DB persistence adapter` aplicando obligatoriamente la cláusula para validar que no se devuelvan registros borrados logicamente.
   - Utilizar el `EquipmentLoanPersistenceMapper` (`ToDomain`) para transformar los resultados de la base de datos en objetos de dominio.
5. **Adaptadores de Entrada (Controller)**:
   - Implementar los métodos correspondientes en `EquipmentLoanController` para las rutas:
     - `GET /api/v1/equipment-loans`
     - `GET /api/v1/equipment-loans/:id`