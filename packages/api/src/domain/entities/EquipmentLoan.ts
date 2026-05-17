import { EquipmentLoanStatus } from '@alentapp/shared';

export class EquipmentLoan {
  // El constructor clásico se usa EXCLUSIVAMENTE para reconstruir
  // la entidad cuando viene desde la base de datos (Mapper).
  constructor(
    public readonly id: string,
    public readonly itemName: string,
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
}