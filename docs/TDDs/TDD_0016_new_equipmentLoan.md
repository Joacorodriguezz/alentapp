---
id: 0016
estado: Propuesto
autor: Facundo Devida
fecha: 2026-05-02
titulo: Registro de Prestamos de equipamiento
---

# TDD-0016: Registro de Prestamos de equipamiento

## Contexto de Negocio (PRD)

### Objetivo

Permitir que un administrativo de de alta un nuevo prestamo de equipamiento digitalmente para tener un registro y una mejor trazabilidad del mismo.

### User Persona

- **Nombre**: Administrativo
- **Necesidad**: Registrar un nuevo prestamo de equipamiento de manera simple y prevenir la perdida de informacion debido al posible extravio de registros manuales en papel

### Criterios de Aceptación

- El sistema debe validar que el prestamo este asociado solo a un socio de tipo "Senior" o "Lifetime”, los socios de tipo "Cadet" tienen prohibido solicitar material.
- El sistema debe validar que la fecha de vencimiento del prestamo sea posterior a la fecha en la que el mismo fue creado
- El estado por defecto al momento de su creacion debe ser “Prestado”
- Al finalizar el sistema debe mostrar un mensaje de exito

## Diseño Técnico (RFC)

### Modelo de Datos

Se define la entidad `EquipmentLoan` con los siguientes datos y restricciones

- `id`: Identificador único universal (UUID).
- `itemName`: Cadena de texto
- `status`: Enumeracion (`Loaned`, `Returned`, `Damaged`)
- `loanDate`: Fecha de creacion.
- `dueDate`: Fecha.
- `memberId`: Identificador único universal (UUID) referenciando a “`member`”.
- `deletedAt`: Fecha (Opcional / Nulo)

### Contrato de API (@alentapp/shared)

- **Endpoint**: `POST /api/v1/equipment-loans`
- **Request Body**:

```tsx
{
    itemName: string;
    dueDate: string;
    memberId: string;  
}
```

- **Response 200 OK**:

```tsx
{
"data": {
        id: "3b2ca8d7-5e6e-4b67-a8b4-482a201c13d9",
        itemName: "Pelota de Básquet Spalding",
        status: "Loaned",
        loanDate: "2026-05-16T15:30:00Z",
        dueDate: "2026-05-23T15:30:00Z",
        memberId: "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d"
    } 
}
```

### Componentes de Arquitectura Hexagonal

- **Domain**:
    - `EquipmentLoan` (Maneja su propia invariante: la fecha de devolución debe ser futura al momento del préstamo, su estado inicial es siempre `Loaned`y `deletedAt`en `null`).
    - **Value Objects:** `EquipmentLoanStatus` ( `Loaned`, `Returned`, `Damaged`).
    - **Reglas de negocio:**  Un préstamo de equipamiento no puede existir si el socio solicitante no tiene categoría "Senior" o "Lifetime”(Esta regla se delega al caso de uso)
- **Application**:
    - Caso de Uso: `CreateEquipmentLoanUseCase` (Consulta la categoría del socio, aplica la restriccion si es necesario, instancia la entidad `EquipmentLoan` y la persiste a traves de `IEquipmentLoanRepository`)
    - Puertos de Salida: `IEquipmentLoanRepository` (Interface del dominio) y `IMemberRepository`(Requerido para consultar la categoria del socio)
    - DTOs: `CreateEquipmentLoanRequest` y `EquipmentLoanResponse`(Estos estaran situados en la carpeta @alentapp/shared)
- **Infrastructure**:
    - Adaptadores de entrada: `EquipmentLoanController` (HTTP) y `EquipmentLoanRouter` 
    - Adaptadores de salida: DB persistence adapter
    - Mappers: `EquipmentLoanPersistenceMapper` con los metodos `ToPersistence` y `ToDomain`.Tambien `EquipmentLoanDTOMapper`con el metodo `ToDTO`.

## Casos de Borde y Errores

| **Escenario** | **Resultado Esperado** | **Código HTTP** |
| :--- | :--- | :--- |
| **Socio no autorizado (Cadete)** | `{ "error": "Los socios categoría Cadete no tienen permitido solicitar material." }` | 403 Forbidden |
| **Fecha de devolución en el pasado** | `{ "error": "La fecha de devolución debe ser posterior a la fecha actual." }` | 400 Bad Request |
| **Socio inexistente** | `{ "error": "El socio solicitado no se encuentra registrado en el sistema." }` | 404 Not Found |
| **Campos obligatorios faltantes** | `{ "error": "Los campos itemName y dueDate son requeridos." }` | 400 Bad Request |
| **Error de conexión a DB** | `{ "error": "Error interno del servidor, reintente más tarde." }` | 500 Internal Server Error |

## Plan de Implementación

## Fase 1: Contratos Shared (`@alentapp/shared`)

1. **Definir DTOs y Value Objects**:
   - Crear y exportar `CreateEquipmentLoanRequest` con los campos necesarios.
   - Crear y exportar `EquipmentLoanResponse` para la salida de la API.
   - Crear el Value Object/Enum `EquipmentLoanStatus` con los estados: `Loaned`, `Returned`, `Damaged`.

---

## Fase 2: Núcleo de Dominio (Domain)

2. **Entidad `EquipmentLoan`**:
   - Implementar la clase con sus atributos y lógica de validación interna (invariantes).
   - El constructor debe asegurar que la fecha de devolución sea futura, el estado inicial sea `Loaned` y `deletedAt` sea `null`.
3. **Puertos (Interfaces)**:
   - Crear la interfaz `IEquipmentLoanRepository` con el método `save()`.

---

## Fase 3: Lógica de Aplicación (Application)

4. **Desarrollar `CreateEquipmentLoanUseCase`**:
   - **Flujo de orquestación**:
     1. Consultar los datos del socio mediante el `IMemberRepository`.
     2. Aplicar la restricción de categoría: Si el socio no es "Senior" o "Lifetime", lanzar una excepción.
     3. Instanciar la entidad `EquipmentLoan` pasándole los datos del request (el constructor validará la fecha).
     4. Persistir la nueva entidad a través del `IEquipmentLoanRepository`.

---

## Fase 4: Infraestructura y Mapeo (Infrastructure)

5. **Mappers**:
   - Implementar `EquipmentLoanPersistenceMapper` con los métodos `ToPersistence` y `ToDomain`.
   - Implementar `EquipmentLoanDTOMapper` con el método `ToDTO` (Dominio -> Response).
6. **Adaptadores de Salida**:
   - Implementar el `DB persistence adapter` concreto que utilice el mapper de persistencia para guardar los datos en la base de datos.
7. **Adaptadores de Entrada**:
   - Desarrollar el `EquipmentLoanController` exponiendo el método para la ruta `POST /api/v1/equipment-loans`.
   - Configurar el `EquipmentLoanRouter` para conectar la ruta con el controlador e inyectar el caso de uso.