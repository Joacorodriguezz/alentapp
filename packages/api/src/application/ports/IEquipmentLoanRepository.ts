import { EquipmentLoan } from '../../domain/entities/EquipmentLoan.js';

export interface IEquipmentLoanRepository {
  save(loan: EquipmentLoan): Promise<void>;
  findById(id: string): Promise<EquipmentLoan | null>;
  update(loan: EquipmentLoan): Promise<void>;
}