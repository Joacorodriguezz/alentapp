---
id: 0029
estado: Propuesto
autor: Leonel Piquet
fecha: 2026-05-28
titulo: Consulta de Certificados Médicos
---

# TDD-0023: Consulta de Certificados Médicos

## Contexto de Negocio (PRD)

### Objetivo
Proveer una interfaz centralizada para que el personal administrativo pueda visualizar el historial de certificados médicos de los socios. El sistema debe permitir identificar rápidamente quiénes cuentan con un apto físico vigente y quiénes tienen su documentación vencida o invalidada para garantizar la seguridad legal del club.

### User Persona
*   **Nombre**: Administrador del club.
*   **Necesidad**: Consultar el estado de salud legal de un socio antes de permitirle realizar acciones condicionadas (como inscripciones a deportes), visualizando tanto el certificado actual como el historial.

### Criterios de Aceptación
*   El sistema debe permitir listar todos los certificados asociados a un `memberId` específico.
*   El sistema debe permitir filtrar la búsqueda para mostrar únicamente el certificado que tiene `isValidated: true`.
*   La respuesta debe incluir los campos: fecha de emisión, vencimiento, institución y matrícula del médico.
*   Si un socio no tiene certificados registrados, el sistema debe informar que no posee antecedentes médicos.

## Diseño Técnico (RFC)

### Modelo de Datos
La operación de lectura accede a la entidad `MedicalCertificate` en Prisma, realizando consultas de selección y filtrado:
*   `memberId`: Filtro obligatorio para recuperar el historial de un socio específico.
*   `isValidated`: Filtro opcional para obtener solo el certificado vigente.

### Contrato de API (@alentapp/shared)

**Éxito:** el cuerpo JSON usa `{ "data": ... }`. **Errores:** `{ "error": "<mensaje en español>" }`

Definición de los endpoints de consulta en el paquete compartido:

*   **Endpoint (Listado)**: `GET /api/v1/medical-certificates?memberId={uuid}`
*   **Endpoint (Individual)**: `GET /api/v1/medical-certificates/:id`
*   **Response Body (MedicalCertificateResponse)**:
```ts
data: {
    id: string;
    issueDate: string;
    expiryDate: string;
    doctorLicence: string;
    institution: string;
    isValidated: boolean;
    miembroId: string
}
```
## Componentes de Arquitectura Hexagonal

* Domain:
	* Puerto IMedicalCertificateRepository: Interfaz que define los métodos findById(id), findAllByMember(miembroId) y findActiveByMember(miembroId).

* Application:
	* Caso de Uso GetMedicalCertificateUseCase: Lógica para recuperar un certificado único por su ID.
	* Caso de Uso GetMemberMedicalHistoryUseCase: Lógica para recuperar la lista completa de certificados de un socio.

* Infrastructure:
	* MedicalCertificateController: Adaptador de entrada que extrae el memberId de la query string o el id de los parámetros de ruta.
	* PrismaMedicalCertificateRepository: Implementación que ejecuta prisma.medicalCertificate.findMany o findUnique aplicando los filtros de búsqueda.


## Casos de Borde y Errores
| Escenario                   | Resultado Esperado                                         | Código HTTP               |
| ----------------------------| -----------------------------------------------------------| ------------------------- |
| Socio sin certificados      | { error: "No se encontraron certificados para este socio" }| 200 OK (Lista vacía)      |
| ID de certificado inválido  | { error: "El ID proporcionado no es un UUID válido" }      | 400 Bad Request           |
| Certificado no encontrado   | { error: "El recurso solicitado no existe" }               | 404 Not Found             |
| Error de infraestructura    | { error: "Error al recuperar los datos de la DB" }         | 500 Internal Server Error |

## Plan de Implementación
1. Definir los tipos de respuesta (DTOs) en el paquete compartido @alentapp/shared.
2. Implementar los métodos de búsqueda en la clase PrismaMedicalCertificateRepository dentro de la capa de Infrastructure.
3. Desarrollar los casos de uso en la capa de Application para la recuperación individual y el historial por socio.
4. Crear el controlador y configurar las rutas GET en el backend.
5. Desarrollar la vista de historial médico en el Frontend (React) para visualizar los datos del socio.
