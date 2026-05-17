import { EquipmentLoan } from '../../domain/entities/EquipmentLoan.js';

export interface IEquipmentLoanRepository {
  save(loan: EquipmentLoan): Promise<void>;
}