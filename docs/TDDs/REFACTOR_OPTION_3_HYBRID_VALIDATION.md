# Plan de Refactor: Validaciones (Opción 3 - Hybrid)

## Índice

- [1. Introducción](#introducción)
- [2. Análisis de Opciones](#análisis-de-opciones)
- [3. Recomendación: Opción 3 (Hybrid)](#recomendación-opción-3-hybrid)
- [4. Fases de Implementación](#fases-de-implementación)
  - [Fase 1: Reparaciones Críticas](#fase-1-reparaciones-críticas)
  - [Fase 2: Refactor de Entities](#fase-2-refactor-de-entities)
  - [Fase 3: Refactor de Validators](#fase-3-refactor-de-validators)
  - [Fase 4: Refactor de Use Cases](#fase-4-refactor-de-use-cases)
  - [Fase 5: Controllers](#fase-5-controllers)
  - [Fase 6: Custom Error Classes](#fase-6-custom-error-classes)
  - [Fase 7: Tipos Faltantes](#fase-7-tipos-faltantes)
  - [Fase 8: Estructura de Tests](#fase-8-estructura-de-tests)
- [5. Orden de Implementación](#orden-de-implementación)
- [6. Resumen y Cronograma](#resumen-y-cronograma)

---

## Introducción

Este documento describe el plan completo para migrar el proyecto a la **Opción 3 (Hybrid Validation)**, una estrategia de validación que separa responsabilidades de forma clara y pragmática:

- **Entities**: Validaciones de invariantes (lógica pura)
- **Validators**: Validaciones con dependencias externas (BD, repositorios)
- **Use Cases**: Orquestación de validaciones y lógica de negocio compleja

### Beneficios de esta opción

✓ **Entidades semánticamente ricas** - No quedan vacías, tienen métodos de negocio
✓ **Separación clara** - Cada capa sabe qué le corresponde validar
✓ **Testeable** - Unit tests sin mocks para entities, integration tests con mocks para validators
✓ **Reutilizable** - Si necesitas Payment en otro contexto, la entidad es completa
✓ **Mantenible** - Cambios en lógica de negocio están en el lugar correcto

---

## Análisis de Opciones

### Opción 1: Todas las validaciones en Validator ❌

```typescript
// Validator tiene TODO
class PaymentValidator {
    validateCreatePayment(data) {
        // Validar tipo, rango, formato
        // Validar unicidad en BD
        // Validar transiciones de estado
        // Validar relaciones
    }
}

// Entity está VACÍA
class Payment {
    readonly id: string;
    readonly amount: number;
    // Sin métodos, sin validación
}
```

**Problemas:**
- Las entidades pierden semántica (solo contenedores de datos)
- Acoplamiento: Un validator necesita saber de repositorios, transiciones, lógica
- Reutilización: Si necesitas validar en otro contexto, duplicas código
- Testabilidad: Validar Payment sin saber qué es un Payment es confuso

---

### Opción 2: Validaciones Divididas por Tipo ⚠️

```typescript
// Controller: Validaciones de formato
PaymentController.create(request) {
    if (!request.body.amount || typeof request.body.amount !== 'number') {
        throw new Error('amount must be a number');
    }
}

// Entity: Invariantes
class Payment {
    constructor(data) {
        if (data.amount <= 0) throw new Error('Amount must be positive');
    }
}

// UseCase: Reglas de negocio complejas
async createPayment(data): Promise<Payment> {
    const member = await memberRepository.findById(data.memberId);
    if (!member) throw new Error('Member not found');
}
```

**Problemas:**
- Controllers mezclan HTTP con lógica (anti-pattern)
- Duplicación: Validar formato antes de crear entity Y en el constructor
- Ambigüedad: ¿Dónde va una validación que depende de dos campos?

---

### Opción 3: Validaciones Híbridas ✅ (RECOMENDADA)

```typescript
// Entity: Invariantes PURAS
class Payment {
    constructor(data) {
        if (data.amount <= 0) throw new Error('Amount must be positive');
        if (data.paymentDate > new Date()) throw new Error('Future payment');
    }

    canTransitionTo(newStatus): boolean {
        return this.status === 'Pending' && newStatus === 'Paid';
    }
}

// Validator: DEPENDENCIAS EXTERNAS
class PaymentValidator {
    async validateMemberExists(memberId): Promise<void> {
        const exists = await this.memberRepository.findById(memberId);
        if (!exists) throw new Error('Member not found');
    }
}

// UseCase: Orquestación
async createPayment(data): Promise<Payment> {
    const payment = new Payment(data);  // Entity lanza si invariantes fallan
    await this.paymentValidator.validateMemberExists(data.memberId);  // Validator con BD
    return this.paymentRepository.save(payment);
}
```

**Ventajas:**
- ✓ Entidades son semanticamente ricas
- ✓ Validators solo hacen lo que saben (consultar dependencias)
- ✓ Separación clara: Lógica pura vs. Lógica impura
- ✓ Testeable: Entity tests sin mocks, Validator tests con mocks
- ✓ Reutilizable: Si necesitas Payment en otro contexto, la entidad es completa

---

## Recomendación: Opción 3 (Hybrid)

**Es lo que ya estás haciendo** (casi), pero con mejoras específicas:

### Principios Clave

```
┌─────────────────────────────────────────────────────────────┐
│                   OPCIÓN 3: HYBRID VALIDATION                │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│ ENTITY = Invariantes (Lógica Pura)                          │
│ ├─ Constructor valida campos básicos (tipo, rango, etc.)    │
│ ├─ Métodos booleanos para queries (canEdit(), isActive())   │
│ └─ Sin dependencias externas                                 │
│                                                               │
│ VALIDATOR = Operaciones con Dependencias                    │
│ ├─ Métodos que requieren BD o repositorios                  │
│ ├─ Métodos que dependen de otras entidades                  │
│ └─ Métodos de lógica pura (sin dependencias)                │
│                                                               │
│ USE CASE = Orquestación                                     │
│ ├─ Valida formato (Validator - lógica pura)                │
│ ├─ Valida dependencias (Validator - con BD)                │
│ ├─ Crea entity (Entity valida invariantes)                 │
│ ├─ Aplica lógica de negocio                                │
│ └─ Persiste y retorna                                       │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

## Fases de Implementación

### FASE 1: Reparaciones Críticas

#### 1.1 Arreglar `UpdateLockerData` faltante

**Archivo:** `packages/api/src/application/useCases/UpdateLockerUseCase.ts`

**Problema:** Se usa `UpdateLockerData` pero no está definido

**Solución:**
```typescript
interface UpdateLockerData {
    number?: number;
    location?: string;
    status?: 'Available' | 'Occupied' | 'Maintenance';
    memberId?: string | null;
}
```

---

### FASE 2: Refactor de Entities

Agregar a cada entity:
1. **Validaciones en constructor** - Lanzar si hay invariantes inválidas
2. **Métodos booleanos** - Queries de negocio (`canEdit()`, `isActive()`, etc.)
3. **Hacer propiedades readonly** - Garantizar inmutabilidad

#### 2.1 Member.ts

**Agregar validaciones en constructor:**
```typescript
constructor(...) {
    if (!Member.isValidEmail(email)) {
        throw new InvalidEmailError('Email format is invalid');
    }
    if (!dni || dni.trim().length === 0) {
        throw new InvalidDniError('DNI cannot be empty');
    }
    // ... más validaciones
}
```

**Agregar métodos:**
```typescript
canChangeStatus(newStatus: MemberStatus): boolean {
    return this.status !== 'Inactivo';
}

isCurrentlyMinor(): boolean {
    return Member.isMinor(this.birthdate);
}
```

#### 2.2 Payment.ts

**Agregar validaciones en constructor:**
```typescript
constructor(...) {
    if (amount <= 0) {
        throw new InvalidAmountError('Amount must be greater than 0');
    }
    if (new Date(paymentDate) > new Date()) {
        throw new FuturePaymentError('Payment date cannot be in the future');
    }
    // ... más validaciones
}
```

**Agregar métodos:**
```typescript
canBeEdited(): boolean {
    return this.status === 'Pending' && this.deletedAt === null;
}

canTransitionTo(newStatus: PaymentStatus): boolean {
    if (this.status === 'Pending' && newStatus === 'Paid') return true;
    if (this.status === 'Paid' && newStatus === 'Canceled') return true;
    return false;
}

isCanceled(): boolean {
    return this.status === 'Canceled' || this.deletedAt !== null;
}

canEditAmount(): boolean {
    return this.status === 'Pending';
}
```

#### 2.3 Locker.ts

**Agregar validaciones en constructor:**
```typescript
constructor(props: LockerProps) {
    if (!props.number || props.number <= 0) {
        throw new InvalidLockerNumberError('Number must be positive');
    }
    if (!props.location || props.location.trim().length === 0) {
        throw new InvalidLocationError('Location cannot be empty');
    }
    // ... más validaciones

    this.id = props.id ?? randomUUID();
    this.number = props.number;
    this.location = props.location.trim();
    this.status = props.status ?? 'Available';
    this.memberId = props.memberId ?? null;
}
```

**Agregar métodos:**
```typescript
canBeDeleted(): boolean {
    return this.memberId === null;
}

canAssignMember(): boolean {
    return this.status !== 'Maintenance';
}

canMoveToMaintenance(): boolean {
    return this.memberId === null;
}

isAvailable(): boolean {
    return this.status === 'Available';
}

isOccupied(): boolean {
    return this.status === 'Occupied';
}

isInMaintenance(): boolean {
    return this.status === 'Maintenance';
}

hasMember(): boolean {
    return this.memberId !== null;
}
```

#### 2.4 Discipline.ts

**Agregar validaciones en constructor y métodos:**

Ver documento para detalles completos. Puntos clave:
- Validar que startDate < endDate
- Validar que reason no está vacío
- Métodos: `isActive()`, `isExpired()`, `canBeDeleted()`

#### 2.5 Sport.ts

**Agregar validaciones en constructor:**
```typescript
constructor(...) {
    if (!name || name.trim().length === 0) {
        throw new InvalidNameError('Name cannot be empty');
    }
    if (maxCapacity <= 0) {
        throw new InvalidCapacityError('Capacity must be greater than 0');
    }
    if (additionalPrice !== null && additionalPrice < 0) {
        throw new InvalidPriceError('Additional price cannot be negative');
    }
}
```

**Mejorar método `update()`** para validar invariantes en nuevo objeto

#### 2.6 EquipmentLoan.ts

Mejorar validaciones existentes, hacer propiedades readonly

#### 2.7 MedicalCertificate.ts

Agregar métodos: `isValid()`, `isExpired()`, `isExpiringssoon()`

---

### FASE 3: Refactor de Validators

#### Principio Clave

Separar en comentarios claros **LÓGICA PURA** vs **CON DEPENDENCIAS**:

```typescript
/**
 * PaymentValidator
 *
 * RESPONSABILIDAD: Validar operaciones con lógica PURA (sin dependencias)
 *
 * ✓ Todas estas validaciones usan solo datos, sin BD
 * ✓ Pueden ser testeadas sin mocks
 */
export class PaymentValidator {
    // ========== LÓGICA PURA (sin dependencias) ==========
    validateRequiredFields(data): void { ... }
    validateAmount(amount: number): void { ... }
    validatePaymentDate(date: string): void { ... }
}
```

#### 3.1 MemberValidator.ts

```typescript
/**
 * RESPONSABILIDAD: Validar operaciones que requieren consultar BD
 */
export class MemberValidator {
    constructor(private memberRepository: IMemberRepository) {}

    // ⚠️ CON DEPENDENCIA EXTERNA (BD)
    async validateDniIsUnique(dni: string, excludeMemberId?: string): Promise<void> { ... }

    // AGREGAR: Validar email único
    async validateEmailIsUnique(email: string, excludeMemberId?: string): Promise<void> { ... }

    // AGREGAR: Validar existencia
    async validateMemberExists(memberId: string): Promise<void> { ... }

    // AGREGAR: Helper para obtener o lanzar
    async getMemberOrThrow(memberId: string): Promise<Member> { ... }
}
```

#### 3.2 PaymentValidator.ts

```typescript
/**
 * RESPONSABILIDAD: Validar operaciones con lógica PURA
 *
 * ✓ TODAS las validaciones son lógica PURA
 */
export class PaymentValidator {
    validateRequiredFields(data): void { ... }
    validateAmount(amount: number): void { ... }
    validatePaymentDate(date: string): void { ... }

    // AGREGAR
    validateUpdateHasFields(data): void { ... }
    validateDescription(description: unknown): void { ... }
}
```

#### 3.3 LockerValidator.ts

**Separar PURO de CON BD:**

```typescript
// ========== LÓGICA PURA ==========
validateNumber(number): void { ... }        // ✓
validateLocation(location): void { ... }    // ✓
validateStatus(status): void { ... }        // ✓
validateUpdateHasFields(data): void { ... } // ✓
validateCanDelete(locker: Locker): void { ... }         // ✓
validateCanAssignMember(locker: Locker): void { ... }   // ✓
validateCanMoveToMaintenance(locker: Locker): void { ... } // ✓

// ========== CON DEPENDENCIAS EXTERNAS (BD) ==========
async validateNumberIsUnique(number): Promise<void> { ... }       // ⚠️
async validateUpdatedNumberIsUnique(number, id): Promise<void> { ... } // ⚠️

// ========== ELIMINAR ==========
// ❌ validateAndCreate() - Mezcla responsabilidades
// Razón: Hacer validación + crear entity es trabajo del Use Case
```

#### 3.4 DisciplineValidator.ts

```typescript
/**
 * RESPONSABILIDAD: Validar operaciones de disciplina
 *
 * ✓ TODAS las validaciones son lógica PURA
 */
export class DisciplineValidator {
    validateDates(startDate, endDate): void { ... }
    validateReason(reason): void { ... }
    validateHasFieldsToUpdate(data): void { ... }
    validateNotDeleted(deletedAt): void { ... }
    validateCanDelete(discipline: Discipline): void { ... }
}
```

#### 3.5 SportValidator.ts

**Separar PURO de CON BD:**

```typescript
// ========== LÓGICA PURA ==========
validateName(name): void { ... }         // ✓
validateMaxCapacity(maxCapacity): void { ... } // ✓
validateAdditionalPrice(price): void { ... }  // ✓
validateUpdateBody(data): void { ... }   // ✓
validateDescription(desc): void { ... }  // ✓

// ========== CON DEPENDENCIAS (BD) ==========
async validateNameIsUnique(name, excludeId?): Promise<void> { ... } // ⚠️
```

---

### FASE 4: Refactor de Use Cases

#### Patrón General

```
1. Validar formato (Validator - lógica pura)
   ↓
2. Validar dependencias (Validator - con BD)
   ↓
3. Crear entity (Entity lanza si hay invariantes inválidas)
   ↓
4. Aplicar lógica de negocio
   ↓
5. Persistir (Repository)
```

#### 4.1 CreatePaymentUseCase.ts

```typescript
async execute(data: CreatePaymentRequest): Promise<Payment> {
    // PASO 1: Validar formato (lógica PURA)
    this.paymentValidator.validateRequiredFields(data);
    this.paymentValidator.validateAmount(data.amount);
    this.paymentValidator.validatePaymentDate(data.paymentDate);

    // PASO 2: Validar dependencias (con BD)
    await this.memberValidator.validateMemberExists(data.memberId);

    // PASO 3: Crear entity (Entity valida invariantes)
    const payment = new Payment(
        randomUUID(),
        data.amount,
        data.description ?? null,
        'Pending',
        data.paymentDate,
        data.memberId,
        null,
        new Date().toISOString(),
        new Date().toISOString(),
    );

    // PASO 4: Persistir
    return this.paymentRepository.save(payment);
}
```

#### 4.2 UpdatePaymentUseCase.ts

```typescript
async execute(id: string, data: UpdatePaymentRequest): Promise<Payment> {
    // PASO 1: Validar que hay campos
    this.paymentValidator.validateUpdateHasFields(data);

    // PASO 2: Obtener payment actual
    const payment = await this.paymentRepository.findByIdIncludeDeleted(id);
    if (!payment) {
        throw new PaymentNotFoundError('Payment not found');
    }

    // PASO 3: Validar que puede ser editado (Entity method)
    if (!payment.canBeEdited()) {
        throw new CannotEditDeletedOrCanceledPaymentError(
            'Cannot edit a payment that is deleted or canceled'
        );
    }

    // PASO 4: Procesar cambios
    const updateData: UpdatePaymentData = {};

    if (data.amount !== undefined) {
        if (!payment.canEditAmount()) {
            throw new CannotEditAmountError('Amount can only be edited if Pending');
        }
        this.paymentValidator.validateAmount(data.amount);
        updateData.amount = data.amount;
    }

    if (data.status !== undefined) {
        if (!payment.canTransitionTo(data.status)) {
            throw new InvalidStatusTransitionError(
                `Cannot transition from ${payment.status} to ${data.status}`
            );
        }
        updateData.status = data.status;
    }

    // PASO 5: Persistir
    return this.paymentRepository.update(id, updateData);
}
```

#### 4.3 CreateLockerUseCase.ts

```typescript
async execute(data: CreateLockerRequest): Promise<Locker> {
    // PASO 1: Validar formato
    this.lockerValidator.validateNumber(data?.number);
    this.lockerValidator.validateLocation(data?.location);

    // PASO 2: Validar unicidad en BD
    await this.lockerValidator.validateNumberIsUnique(data.number);

    // PASO 3: Crear entity (Entity valida invariantes)
    const locker = new Locker({
        number: data.number,
        location: data.location.trim(),
        status: 'Available',
        memberId: null,
    });

    // PASO 4: Persistir
    return this.lockerRepository.create(locker);
}
```

#### 4.4 UpdateLockerUseCase.ts (Más Compleja)

```typescript
async execute(id: string, data: UpdateLockerRequest): Promise<Locker> {
    // PASO 1: Validar que hay campos
    this.lockerValidator.validateUpdateHasFields(data);

    // PASO 2: Obtener locker actual
    const locker = await this.lockerRepository.findById(id);
    if (!locker) throw new LockerNotFoundError('Locker not found');

    const updateData: UpdateLockerData = {};

    // PASO 3: Procesar NUMBER
    if (data.number !== undefined) {
        this.lockerValidator.validateNumber(data.number);
        await this.lockerValidator.validateUpdatedNumberIsUnique(data.number, locker.id);
        updateData.number = data.number;
    }

    // PASO 4: Procesar LOCATION
    if (data.location !== undefined) {
        this.lockerValidator.validateLocation(data.location);
        updateData.location = data.location.trim();
    }

    // PASO 5: Procesar MEMBER ASSIGNMENT (lógica compleja)
    if (data.memberId !== undefined) {
        await this.processMemberAssignment(locker, data.memberId, updateData);
    }

    // PASO 6: Procesar STATUS
    if (data.status !== undefined && data.status === 'Maintenance') {
        await this.processMaintenanceTransition(locker, updateData);
    }

    // PASO 7: Persistir
    return this.lockerRepository.update(id, updateData);
}

private async processMemberAssignment(...): Promise<void> {
    if (newMemberId !== null) {
        this.lockerValidator.validateCanAssignMember(locker);
        await this.memberValidator.validateMemberExists(newMemberId);
        updateData.memberId = newMemberId;
        updateData.status = 'Occupied';
    } else {
        updateData.memberId = null;
        updateData.status = 'Available';
    }
}

private async processMaintenanceTransition(...): Promise<void> {
    const finalMemberId = updateData.memberId !== undefined
        ? updateData.memberId
        : locker.memberId;

    if (finalMemberId !== null) {
        throw new LockerHasMemberError('Cannot move to maintenance with assigned member');
    }

    updateData.status = 'Maintenance';
    updateData.memberId = null;
}
```

#### 4.5 CreateMemberUseCase.ts

```typescript
async execute(data: CreateMemberRequest): Promise<Member> {
    // PASO 1: Validar formato
    if (!Member.isValidEmail(data.email)) {
        throw new InvalidEmailError('Email format is invalid');
    }
    if (!data.birthdate || isNaN(new Date(data.birthdate).getTime())) {
        throw new InvalidBirthdateError('Birthdate is invalid');
    }

    // PASO 2: Validar uniqueness
    await this.memberValidator.validateDniIsUnique(data.dni);
    await this.memberValidator.validateEmailIsUnique(data.email);

    // PASO 3: Resolver categoría
    const finalCategory = Member.resolveCategory(data.birthdate, data.category);

    // PASO 4: Crear entity
    const member = new Member(
        randomUUID(),
        data.dni.trim(),
        data.name.trim(),
        data.email.trim(),
        data.birthdate,
        finalCategory,
        'Activo',
        new Date().toISOString(),
    );

    // PASO 5: Persistir
    return this.memberRepository.create(member);
}
```

---

### FASE 5: Controllers

**Responsabilidad:** HTTP concerns only

```typescript
async create(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
        // 1. Extraer datos
        const data = request.body as CreatePaymentRequest;

        // 2. Ejecutar use case
        const payment = await this.createPaymentUseCase.execute(data);

        // 3. Retornar DTO
        reply.status(201).send({
            data: PaymentMapper.toDTO(payment),
        });
    } catch (error) {
        // 4. Mapear errores a HTTP status
        this.handleCreatePaymentError(error, reply);
    }
}

private handleCreatePaymentError(error: unknown, reply: FastifyReply): void {
    const message = error instanceof Error ? error.message : 'Unknown error';

    if (error instanceof InvalidAmountError || error instanceof InvalidPaymentDateError) {
        return reply.status(400).send({ error: message });
    }
    if (error instanceof MemberNotFoundError) {
        return reply.status(404).send({ error: message });
    }
    if (error instanceof CannotEditDeletedOrCanceledPaymentError) {
        return reply.status(409).send({ error: message });
    }
    if (error instanceof InvalidStatusTransitionError) {
        return reply.status(422).send({ error: message });
    }

    reply.status(500).send({ error: 'Internal server error' });
}
```

---

### FASE 6: Custom Error Classes

**Nueva carpeta:** `packages/api/src/domain/errors/`

```typescript
// DomainError.ts
export abstract class DomainError extends Error {
    constructor(message: string) {
        super(message);
        this.name = this.constructor.name;
    }
}

// MemberErrors.ts
export class InvalidEmailError extends DomainError {}
export class InvalidDniError extends DomainError {}
export class InvalidNameError extends DomainError {}
export class InvalidBirthdateError extends DomainError {}
export class DniAlreadyExistsError extends DomainError {}
export class EmailAlreadyExistsError extends DomainError {}
export class MemberNotFoundError extends DomainError {}

// PaymentErrors.ts
export class InvalidAmountError extends DomainError {}
export class InvalidPaymentDateError extends DomainError {}
export class InvalidDescriptionError extends DomainError {}
export class PaymentNotFoundError extends DomainError {}
export class CannotEditDeletedOrCanceledPaymentError extends DomainError {}
export class CannotEditAmountError extends DomainError {}
export class InvalidStatusTransitionError extends DomainError {}
export class FuturePaymentError extends DomainError {}
export class MissingFieldError extends DomainError {}
export class InvalidRequestError extends DomainError {}

// LockerErrors.ts
export class InvalidLockerNumberError extends DomainError {}
export class InvalidLocationError extends DomainError {}
export class InvalidStatusError extends DomainError {}
export class LockerNotFoundError extends DomainError {}
export class LockerNumberAlreadyExistsError extends DomainError {}
export class LockerHasMemberError extends DomainError {}
export class LockerInMaintenanceError extends DomainError {}

// DisciplineErrors.ts
export class InvalidReasonError extends DomainError {}
export class InvalidStartDateError extends DomainError {}
export class InvalidEndDateError extends DomainError {}
export class InvalidDateRangeError extends DomainError {}
export class DisciplineNotFoundError extends DomainError {}
export class DisciplineAlreadyDeletedError extends DomainError {}
export class ActiveDisciplineError extends DomainError {}

// SportErrors.ts
export class InvalidNameError extends DomainError {}
export class InvalidCapacityError extends DomainError {}
export class InvalidPriceError extends DomainError {}
export class SportNameAlreadyExistsError extends DomainError {}
```

---

### FASE 7: Tipos Faltantes

**Archivo:** `packages/api/src/application/types/index.ts`

```typescript
export interface UpdateLockerData {
    number?: number;
    location?: string;
    status?: 'Available' | 'Occupied' | 'Maintenance';
    memberId?: string | null;
}

export interface UpdatePaymentData {
    amount?: number;
    description?: string;
    status?: PaymentStatus;
}

export type CreateLockerRequest = {
    number: number;
    location: string;
    status?: 'Available' | 'Occupied' | 'Maintenance';
    memberId?: string | null;
};

export type UpdateLockerRequest = {
    number?: number;
    location?: string;
    status?: 'Available' | 'Occupied' | 'Maintenance';
    memberId?: string | null;
};
```

---

### FASE 8: Estructura de Tests

```
tests/
├── unit/
│   ├── domain/
│   │   ├── entities/
│   │   │   ├── Member.test.ts
│   │   │   ├── Payment.test.ts
│   │   │   ├── Locker.test.ts
│   │   │   ├── Discipline.test.ts
│   │   │   ├── Sport.test.ts
│   │   │   ├── EquipmentLoan.test.ts
│   │   │   └── MedicalCertificate.test.ts
│   │   │
│   │   └── services/
│   │       ├── PaymentValidator.test.ts      ← Lógica PURA
│   │       ├── DisciplineValidator.test.ts   ← Lógica PURA
│   │       ├── MemberValidator.test.ts       ← Con mocks
│   │       ├── LockerValidator.test.ts       ← Ambos tipos
│   │       └── SportValidator.test.ts        ← Ambos tipos
│   │
│   └── application/
│       └── useCases/
│           ├── CreatePaymentUseCase.test.ts
│           ├── UpdatePaymentUseCase.test.ts
│           ├── CreateLockerUseCase.test.ts
│           ├── UpdateLockerUseCase.test.ts
│           ├── CreateMemberUseCase.test.ts
│           └── ... (más use cases)
│
├── integration/
│   ├── repositories/
│   │   ├── PostgresPaymentRepository.test.ts
│   │   ├── PostgresMemberRepository.test.ts
│   │   ├── PostgresLockerRepository.test.ts
│   │   └── ... (más repositories)
│   │
│   └── useCases/
│       ├── CreatePaymentUseCase.integration.test.ts
│       ├── UpdatePaymentUseCase.integration.test.ts
│       ├── CreateLockerUseCase.integration.test.ts
│       └── ... (más use cases)
│
├── e2e/
│   ├── payment.e2e.test.ts
│   ├── member.e2e.test.ts
│   ├── locker.e2e.test.ts
│   ├── discipline.e2e.test.ts
│   ├── sport.e2e.test.ts
│   └── workflows.e2e.test.ts
│
└── fixtures/
    ├── mocks/
    │   ├── MemberMock.ts
    │   ├── PaymentMock.ts
    │   └── ...
    │
    ├── factories/
    │   ├── MemberFactory.ts
    │   ├── PaymentFactory.ts
    │   └── ...
    │
    └── testDb.ts
```

### Proporción Recomendada

```
Total tests: ~150 tests

├── Unit Tests: ~85 tests (55%)  ← Rápidos, aislados
├── Integration Tests: ~45 tests (30%)  ← Más lentos, requieren BD
└── E2E Tests: ~20 tests (15%)  ← Muy lentos, flujos críticos solo
```

---

## Orden de Implementación

### Secuencia Recomendada (del más simple al más complejo)

| # | Fase | Archivos | Complejidad | Tiempo | Impacto |
|---|------|----------|------------|--------|---------|
| 1 | **Crear Error Classes** | `domain/errors/` | Baja | 1-2h | Bajo inicial, alto después |
| 2 | **Crear Tipos Faltantes** | `application/types/` | Baja | 30min | Bajo |
| 3 | **Refactor Entities** | `domain/entities/` | Media-Alta | 4-6h | ALTO |
| 4 | **Refactor Validators** | `domain/services/` | Media | 2-3h | MEDIO |
| 5 | **Refactor Use Cases** | `application/useCases/` | Media-Alta | 4-5h | ALTO |
| 6 | **Mejorar Controllers** | `infrastructure/controllers/` | Media | 1-2h | MEDIO |
| 7 | **Crear Tests** | `tests/` | Muy Alta | 8-12h | ALTO |

### Por Entidad (Dentro de Entities)

**Orden de complejidad (más simple a más complejo):**

1. `Sport.ts` (45 min)
2. `Member.ts` (45 min)
3. `Discipline.ts` (1h)
4. `Payment.ts` (1h)
5. `Locker.ts` (1.5h)
6. `EquipmentLoan.ts` (30 min)
7. `MedicalCertificate.ts` (30 min)

### Por Use Case (Dentro de Use Cases)

**Orden de complejidad (más simple a más complejo):**

1. `CreatePaymentUseCase.ts` (1h)
2. `CreateMemberUseCase.ts` (1h)
3. `CreateLockerUseCase.ts` (30 min)
4. `UpdatePaymentUseCase.ts` (1h)
5. `UpdateLockerUseCase.ts` (2-3h) ← MÁS COMPLEJA

---

## Resumen y Cronograma

### Resumen de Cambios por Archivo

| Archivo | Cambios | Tiempo |
|---------|---------|--------|
| **Member.ts** | + validaciones en constructor + métodos | 45min |
| **Payment.ts** | + validaciones en constructor + métodos de transición | 1h |
| **Locker.ts** | + validaciones en constructor + métodos booleanos | 1.5h |
| **Discipline.ts** | + validaciones en constructor + métodos booleanos | 1h |
| **Sport.ts** | + validaciones en constructor + métodos booleanos | 45min |
| **EquipmentLoan.ts** | Mejorar validaciones existentes | 30min |
| **MedicalCertificate.ts** | + métodos booleanos | 30min |
| **MemberValidator.ts** | + métodos para BD | 30min |
| **PaymentValidator.ts** | Comentarios PURO + mejorar | 30min |
| **LockerValidator.ts** | Separar PURO/BD + eliminar validateAndCreate | 1h |
| **DisciplineValidator.ts** | Comentarios PURO + mejorar | 30min |
| **SportValidator.ts** | Separar PURO/BD | 45min |
| **CreatePaymentUseCase.ts** | Mejorar orquestación | 1h |
| **UpdatePaymentUseCase.ts** | Mejorar orquestación | 1h |
| **CreateLockerUseCase.ts** | Mejorar orquestación | 30min |
| **UpdateLockerUseCase.ts** | Refactor COMPLETO | 2-3h |
| **CreateMemberUseCase.ts** | Mejorar orquestación | 1h |
| **Controllers** | Estandarizar errores | 1-2h |
| **Error Classes** | Crear todas | 1-2h |
| **Tipos** | Crear faltantes | 30min |
| **Tests** | Crear suite completa | 8-12h |

### Cronograma Total

**TIEMPO TOTAL ESTIMADO: 30-40 horas**

- **Fase 1-2 (Reparaciones):** 1-2 horas
- **Fase 2 (Entities):** 4-6 horas
- **Fase 3 (Validators):** 2-3 horas
- **Fase 4 (Use Cases):** 4-5 horas
- **Fase 5 (Controllers):** 1-2 horas
- **Fase 6-7 (Errors + Types):** 2-3 horas
- **Fase 8 (Tests):** 8-12 horas

### Próximos Pasos

1. ✅ Revisar este plan
2. ⏳ Crear estructura de tests
3. ⏳ Implementar error classes
4. ⏳ Refactor entities (empezar por Sport, Member)
5. ⏳ Refactor validators (separar PURO/BD)
6. ⏳ Refactor use cases (empezar por CreatePayment)
7. ⏳ Estandarizar controllers
8. ⏳ Crear suite de tests

---

## Referencias

- [ARCHITECTURE.md](./ARCHITECTURE.md) - Arquitectura general del proyecto
- [TESTING.md](./TESTING.md) - Guía de testing
- [CONTRIBUTING.md](./CONTRIBUTING.md) - Guía de contribución

