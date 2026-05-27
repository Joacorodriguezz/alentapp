# Contexto de Refactor: Validaciones Hibridas

## Objetivo

Este documento define el criterio general para refactorizar validaciones en todas las entidades del proyecto.

La regla principal es:

> Implementar solamente las validaciones que estan escritas en los TDD. No agregar reglas nuevas aunque parezcan necesarias.

El objetivo no es ampliar el dominio, sino ubicar cada validacion existente en la capa correcta.

## Fuente de verdad

Los TDD son la unica fuente de verdad funcional para este refactor.

Antes de mover, crear o ajustar una validacion, se debe identificar en que TDD aparece la regla. Si una regla no aparece en un TDD, queda fuera del alcance.

TDDs por entidad:

| Entidad | TDDs aplicables |
| --- | --- |
| `Member` | `TDD_0001_new-member`, `TDD_0002_update_member`, `TDD_0003_delete_member` |
| `Locker` | `TDD_0004_new_locker`, `TDD_0005_update_locker`, `TDD_0006_delete_locker`, `TDD_0007_read_locker` |
| `Sport` | `TDD_0008_new_sport`, `TDD_0009_update_sport`, `TDD_0010_delete_sport`, `TDD_0011_read_sport` |
| `Discipline` | `TDD_0012_new_discipline`, `TDD_0013_update_discipline`, `TDD_0014_delete_discipline`, `TDD_0015_read_discipline` |
| `EquipmentLoan` | `TDD_0016_new_equipmentLoan`, `TDD_0017_update_equipmentLoan`, `TDD_0018_delete_equipmentLoan`, `TDD_0019_read_equipmentLoan` |
| `MedicalCertificate` | `TDD_0020_new_medicalcertificate`, `TDD_0021_update_medicalcertificate`, `TDD_0022_delete_medicalcertificate`, `TDD_0023_read_medicalcertificate` |
| `Payment` | `TDD_0024_new_payment`, `TDD_0025_read_payment`, `TDD_0026_update_payment`, `TDD_0027_delete_payment` |

## Criterio de separacion

Se usa una estrategia mixta:

1. Las entidades validan invariantes propias.
2. Los validators validan reglas que necesitan consultar BD, repositorios u otras entidades.
3. Los use cases orquestan el flujo y deciden en que orden aplicar las reglas.
4. Los controllers no contienen reglas de negocio; solo traducen HTTP a use cases y errores a respuestas.

## Matriz de decision

| Pregunta | Capa |
| --- | --- |
| La regla esta en un TDD? | Si no esta, no se implementa. |
| Depende solo de campos propios de la entidad? | Entidad. |
| Depende del estado interno de esa misma entidad? | Entidad. |
| Depende de consultar BD, unicidad o existencia? | Validator o use case usando repositorio. |
| Depende de otra entidad? | Validator o use case. |
| Es una transicion de estado definida por TDD para esa entidad? | Entidad. |
| Es una regla de autorizacion basada en otra entidad? | Use case o validator con dependencia. |
| Es parseo HTTP, status code o forma del response? | Controller. |
| Es filtrado persistente, por ejemplo ocultar eliminados logicamente? | Repositorio, si el TDD lo pide. |

## Entidades

Las entidades deben contener solo reglas propias del objeto de dominio.

Corresponde mover a la entidad:

- Validaciones sobre campos propios cuando el TDD las define.
- Estados iniciales por defecto cuando el TDD los define.
- Transiciones de estado permitidas o bloqueadas cuando el TDD las define.
- Reglas sobre `deletedAt` cuando el TDD indique baja logica o bloqueo por eliminado.
- Metodos de comportamiento que expresen reglas del propio objeto.

No corresponde agregar a la entidad:

- Validaciones de unicidad.
- Validaciones de existencia de otra entidad.
- Consultas a repositorios o BD.
- Reglas que no esten en los TDD.
- Validaciones de formato no especificadas en los TDD.

Ejemplo de criterio:

```ts
// Si el TDD dice que amount debe ser mayor a cero,
// esta validacion pertenece a Payment porque depende solo de Payment.
if (amount <= 0) {
  throw new Error('El monto debe ser mayor a cero');
}

// Si el TDD dice que memberId debe existir,
// NO pertenece a Payment porque requiere consultar Member/BD.
```

## Validators

Los validators se usan para reglas que no dependen solamente de la entidad.

Corresponde dejar en validators:

- Unicidad de campos contra BD.
- Existencia de otra entidad.
- Reglas que requieren repositorios.
- Reglas que combinan datos de mas de una entidad.

No corresponde que un validator:

- Cree entidades.
- Duplique invariantes que ya valida la entidad.
- Agregue reglas que no esten en los TDD.
- Mezcle validacion con persistencia.

Ejemplo de criterio:

```ts
class MemberValidator {
  async validateDniIsUnique(dni: string): Promise<void> {
    // Corresponde aca porque requiere consultar persistencia.
  }
}
```

## Use Cases

Los use cases son responsables de coordinar el flujo.

Patron general:

1. Recibir el request tipado.
2. Consultar repositorios si el TDD lo requiere.
3. Ejecutar validators para reglas con dependencias.
4. Crear o modificar la entidad para que aplique sus invariantes propias.
5. Persistir cambios.
6. Retornar entidades o DTOs segun corresponda.

Los use cases pueden tomar decisiones de flujo, pero no deben inventar reglas fuera de los TDD.

Ejemplo:

```ts
async execute(data: CreateEquipmentLoanRequest): Promise<EquipmentLoan> {
  const member = await this.memberRepository.findById(data.memberId);

  if (!member) {
    throw new Error('El socio solicitado no se encuentra registrado en el sistema.');
  }

  // La regla de categoria no pertenece a EquipmentLoan porque depende de Member.
  if (member.category === 'Cadet') {
    throw new Error('Los socios categoria Cadete no tienen permitido solicitar material.');
  }

  // La fecha de devolucion si pertenece a EquipmentLoan porque es propia del prestamo.
  const loan = EquipmentLoan.create(id, data.itemName, new Date(data.dueDate), data.memberId);

  return this.equipmentLoanRepository.save(loan);
}
```

## Controllers

Los controllers deben limitarse a:

- Extraer parametros, body y query params.
- Invocar el use case.
- Mapear resultado a response.
- Mapear errores conocidos a status HTTP definidos por los TDD.

No deben contener:

- Reglas de negocio.
- Consultas directas que salteen use cases.
- Validaciones duplicadas del dominio.

## Repositorios

Los repositorios se encargan de persistencia.

Pueden contener filtros tecnicos cuando el TDD los exige, por ejemplo:

- No devolver registros con `deletedAt` cuando el TDD indique baja logica.
- Buscar por ID.
- Verificar existencia o unicidad mediante queries usadas por validators/use cases.

No deben contener reglas de negocio que correspondan a entidades o use cases.

## Propiedades readonly

Hacer `readonly` solo las propiedades que no deban mutar segun los TDD y el flujo del dominio.

No hacer `readonly` una propiedad si algun TDD requiere modificarla.

Ejemplos:

- `id` normalmente puede ser `readonly`.
- Fechas de creacion normalmente pueden ser `readonly`.
- Campos editables por TDD no deben ser `readonly`.
- `deletedAt` no debe ser `readonly` si el TDD requiere baja logica.
- `status` no debe ser `readonly` si el TDD requiere transiciones de estado.

## Checklist por entidad

Para cada entidad:

1. Leer todos los TDD asociados.
2. Listar las reglas explicitamente indicadas.
3. Separar cada regla usando la matriz de decision.
4. Mover a la entidad solo las invariantes propias.
5. Dejar en validator/use case las reglas con BD u otras entidades.
6. Ajustar `readonly` segun mutabilidad requerida por los TDD.
7. No agregar validaciones nuevas.
8. Agregar o ajustar tests solo para reglas cubiertas por TDD.

## Aplicacion por entidad

### Member

Usar los TDD de alta, actualizacion y baja de socios.

En la entidad van las reglas propias de `Member`, como estado inicial o comportamiento interno indicado por los TDD.

En validator/use case van reglas como DNI unico, email unico o cualquier validacion que requiera consultar persistencia.

### Locker

Usar los TDD de alta, actualizacion, baja y lectura de lockers.

En la entidad van las reglas propias del locker y sus cambios de estado si estan definidos por los TDD.

En validator/use case van reglas que requieran consultar socios, verificar numero unico o coordinar asignaciones con otra entidad.

### Sport

Usar los TDD de alta, actualizacion, baja y lectura de deportes.

En la entidad van las reglas propias de sus campos si estan indicadas por los TDD.

En validator/use case van reglas de unicidad o dependencia externa.

### Discipline

Usar los TDD de alta, actualizacion, baja y lectura de disciplinas.

En la entidad van las reglas propias de fechas, estado o baja logica cuando esten indicadas por los TDD.

En validator/use case van reglas que dependan de consultas o de otra entidad.

### EquipmentLoan

Usar los TDD de alta, actualizacion, baja y lectura de prestamos de equipamiento.

En la entidad van las reglas propias del prestamo: fechas propias, estado inicial, transiciones y baja logica cuando los TDD lo indiquen.

En validator/use case van reglas como socio existente o categoria del socio, porque dependen de `Member` o BD.

### MedicalCertificate

Usar los TDD de alta, actualizacion, baja y lectura de certificados medicos.

En la entidad van las reglas propias del certificado y sus fechas si estan indicadas por los TDD.

En validator/use case van reglas que dependan de socio existente u otra consulta externa.

### Payment

Usar los TDD de alta, lectura, actualizacion y baja de pagos.

En la entidad van reglas propias del pago como monto, fecha, estado inicial, transiciones, bloqueo por estado o baja logica cuando los TDD lo indiquen.

En validator/use case van reglas como socio existente, porque requieren consultar `Member`.



## Resumen

La opcion hibrida queda definida asi:

- Entidad: valida lo propio de sus campos y estado interno.
- Validator: valida reglas con BD, repositorios u otras entidades.
- Use case: orquesta.
- Controller: adapta HTTP.
- Repository: persiste y filtra segun lo pedido por TDD.

La implementacion debe ser estricta respecto de los TDD: no se agregan validaciones nuevas fuera del alcance documentado.
