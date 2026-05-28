import { EquipmentLoanStatus } from '@alentapp/shared';

export class EquipmentLoan {
  // El constructor clásico se usa EXCLUSIVAMENTE para reconstruir
  // la entidad cuando viene desde la base de datos (Mapper).
  constructor(
    public readonly id: string,
    public itemName: string,
    public status: EquipmentLoanStatus,
    public readonly loanDate: Date,
    public dueDate: Date,
    public readonly memberId: string,
    public deletedAt: Date | null
  ) {}

  // El Factory Method 'create' se usa EXCLUSIVAMENTE para
  // dar de alta un préstamo nuevo desde el Caso de Uso.
  static create(
    id: string,
    itemName: string,
    dueDate: Date,
    memberId: string
  ): EquipmentLoan {
    const loanDate = new Date();

    // Invariante 1: La fecha de devolución debe ser futura
    if (dueDate <= loanDate) {
      throw new Error('La fecha de devolución debe ser posterior a la fecha actual.');
    }

    return new EquipmentLoan(
      id,
      itemName,
      EquipmentLoanStatus.Loaned, // Invariante 2: Estado inicial
      loanDate,
      dueDate,
      memberId,
      null // Invariante 3: No está eliminado
    );
  }

  // Actualiza los campos editables. Si el préstamo ya fue finalizado,
  // bloquea la edición de itemName y dueDate.
  updateInfo(itemName?: string, dueDate?: string): void {
    const isClosed = this.status === EquipmentLoanStatus.Returned || this.status === EquipmentLoanStatus.Damaged;

    if (isClosed && (itemName !== undefined || dueDate !== undefined)) {
      throw new Error('No se pueden modificar datos (itemName, dueDate) de un préstamo ya cerrado.');
    }

    if (dueDate !== undefined) {
      const newDueDate = new Date(dueDate);
      if (newDueDate <= new Date()) {
        throw new Error('La nueva fecha de devolución debe ser posterior a la fecha actual.');
      }
      this.dueDate = newDueDate;
    }

    if (itemName !== undefined) {
      this.itemName = itemName;
    }
  }

  // Cambia el estado del préstamo. Bloquea regresar a 'Loaned' si ya fue finalizado.
  changeStatus(newStatus: EquipmentLoanStatus): void {
    const isClosed = this.status === EquipmentLoanStatus.Returned || this.status === EquipmentLoanStatus.Damaged;

    if (isClosed && newStatus === EquipmentLoanStatus.Loaned) {
      throw new Error("No se puede cambiar el estado a 'Prestado' si el préstamo ya fue finalizado.");
    }

    this.status = newStatus;
  }

  // Realiza la baja lógica del préstamo
  delete(): void {
    if (this.deletedAt !== null) {
      throw new Error('El préstamo que intenta eliminar no se encuentra registrado.');
    }
    this.deletedAt = new Date();
  }
}