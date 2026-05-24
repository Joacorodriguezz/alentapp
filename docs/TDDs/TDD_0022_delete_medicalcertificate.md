---
id: 0022
estado: Propuesto
autor: Leonel Piquet
fecha: 2026-05-02
titulo: Borrado Lógico de Certificado Médico
---

# TDD-0022: Borrado Lógico de Certificado Médico

## Contexto de Negocio (PRD)

### Objetivo
Permitir la anulación de un certificado médico en caso de que haya sido cargado por error o se detecte una irregularidad posterior, garantizando que el socio deje de estar habilitado para actividades deportivas de forma inmediata sin eliminar el registro histórico del sistema.

### User Persona
*   **Nombre**: Administrador del Club.
*   **Necesidad**: Desactivar un certificado médico de manera definitiva cuando el documento original es revocado o se detecta que no es válido, asegurando que el sistema bloquee automáticamente el acceso del socio.

### Criterios de Aceptación
*   El sistema no debe realizar un borrado físico (DELETE) de la fila en la base de datos para mantener la integridad referencial.
*   Al ejecutar la acción, el campo `isValidated` debe cambiar a `false` de forma permanente.
*   Una vez anulado, el certificado no podrá ser utilizado por otros módulos (como Inscripciones o Accesos) para habilitar al socio.
*   El sistema debe solicitar una confirmación antes de proceder con la anulación.

## Diseño Técnico (RFC)

### Modelo de Datos
La operación impacta en la entidad `MedicalCertificate` modificando su estado de vigencia:
*   `isValidated`: Cambia de `true` a `false`.

### Contrato de API (@alentapp/shared)
**Éxito:** el cuerpo JSON usa `{ "data": ... }`. **Errores:** `{ "error": "<mensaje en español>" }`
Se utilizará el método DELETE semántico, aunque internamente realice una actualización de estado:

*   **Endpoint**: `DELETE /api/v1/medical-certificates/:id`
*   **Request Body**: N/A (Se utiliza el ID de la URL).

### Componentes de Arquitectura Hexagonal
Organización de la lógica según el estándar del monorepo:

*   **Domain**:
    *   Puerto `IMedicalCertificateRepository`: Método `LogicalDelete(id)`.
    *   Regla de negocio: Un certificado anulado no puede volver a activarse manualmente; se debe cargar uno nuevo.
*   **Application**:
    *   Caso de Uso `DeleteMedicalCertificateUseCase`: Valida la existencia del ID y ejecuta la transición de estado a través del repositorio.
*   **Infrastructure**:
    *   `MedicalCertificateController`: Adaptador de entrada que gestiona la respuesta exitosa (204 No Content) o errores de ruta.
    *   `PrismaMedicalCertificateRepository`: Implementación que ejecuta `prisma.medicalCertificate.update` seteando el flag `esta_validado: false`.

## Casos de Borde y Errores
| Escenario                   | Resultado Esperado                                                | Código HTTP               |
| ----------------------------| ----------------------------------------------------------------- | ------------------------- |
| ID inexistente              | { error: "Certificado no encontrado" }                            | 404 Not Found             |
| Certificado ya anulado      | { data: El sistema confirma la operación exitosa (Idempotencia) } | 204 No Content            |
| Error de base de datos      | { error: "Error al procesar la baja lógica" }                     | 500 Internal Server Error |
| ID con formato inválido     | { error: "El ID proporcionado no es un UUID válido"}              | 400 Bad Request           |
## Plan de Implementación
1.  Definir el endpoint de eliminación en el controlador del backend.
2.  Implementar el método de actualización de estado en el repositorio de Prisma.
3.  Desarrollar el caso de uso en la capa de Application para manejar la lógica de baja.
4.  Agregar el botón de "Anular" en la interfaz de usuario de Alentapp y conectar con la API.
