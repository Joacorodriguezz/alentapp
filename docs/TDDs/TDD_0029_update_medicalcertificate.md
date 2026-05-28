---
id: 0029
estado: Propuesto
autor: Leonel Piquet
fecha: 2026-05-28
titulo: Actualización de Certificado Médico
---

# TDD-0021: Actualización de Certificado Médico

## Contexto de Negocio (PRD)

### Objetivo
Permitir la corrección de datos cargados erróneamente en un certificado médico (como errores de ortografía en la institución o errores en la matrícula del médico) sin necesidad de eliminar el registro, manteniendo la trazabilidad del socio.

### User Persona
*   **Nombre**: Administrador del club.
*   **Necesidad**: Editar la información de un certificado cuando detecta un error de carga manual, asegurando que los cambios se guarden correctamente sin alterar la lógica de vigencia del socio.

### Criterios de Aceptación
*   El sistema debe permitir la edición de: fecha de emisión, fecha de vencimiento, matrícula y nombre de la institución.
*   El sistema debe validar que, si se modifica la fecha de vencimiento, esta siga siendo posterior a la fecha de emisión.
*   No se debe permitir cambiar el `memberId` asociado; si el certificado se cargó al socio equivocado, debe anularse y crearse uno nuevo.
*   Al finalizar la edición, el sistema debe confirmar que los cambios fueron persistidos exitosamente.

## Diseño Técnico (RFC)

### Modelo de Datos
La operación de actualización impacta sobre la entidad `MedicalCertificate` existente en Prisma:
*   `issueDate`: DateTime (Editable).
*   `expiryDate`: DateTime (Editable, con validación de rango).
*   `doctorLicence`: String (Editable).
*   `institution`: String (Editable).

### Contrato de API (@alentapp/shared)
**Éxito:** el cuerpo JSON usa `{ "data: ... "}`. **Errores:** `{ "error": "<mensaje en español>"}`. 
Definición del contrato para la actualización parcial (Put):

*   **Endpoint**: `PUT /api/v1/medical-certificates/:id`
*   **Request Body (UpdateMedicalCertificateRequest)**:
```ts
data: {
    issueDate: string;
    expiryDate?: string;
    doctorLicence?: string;
    institution?: string;
}
```

### Componentes de Arquitectura Hexagonal
*   **Domain**:
	* Lógica de validación de fecha dentro de la entidad de dominio MedicalCertificate.
	* Puerto IMedicalCertificateRepository: Método Update(id, data).

*   **Application**:
	* Caso de uso UpdateMedicalCertificateUseCase: Se encarga de recuperar el registro actual, aplicar las validaciones de negocio sobre los nuevos datos y solicitar la persistencia.

*   **Infrastructure**:
	* MedicalCertificateController: Valida que el ID enviado en la URL sea un UUID válido antes de pasar la petición al caso de uso.

## Casos de Borde y Errores
| Escenario                                      | Resultado Esperado                                                           | Código HTTP     |     
| -----------------------------------------------|------------------------------------------------------------------------------|-----------------| 
| ID de certificado inexistente                  | { error: "Certificado no encontrado" }                                       | 404 Not Found   |      
| Nueva expiryDate menor que issueDate           | { error: "La fecha de vencimiento no puede ser anterior a la de la emisión" }| 400 Bad Request |   
| Intento de modificar miembroId                 | { error: "Error de validación" }                                             | 400 Bad Request |


## Plan de Implementación
1. Definir el DTO de actualización en el paquete.
2. Agregar el método update a la interfaz del repositorio en la capa de Domain.
3. Implementar el caso de uso en la capa de Application con las reglas de validación de fechas.
4. Crear el endpoint en el controlador y realizar las pruebas de integración con el contenedor de postgres.
