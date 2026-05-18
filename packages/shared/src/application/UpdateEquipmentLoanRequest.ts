import { EquipmentLoanStatus } from '../domain/EquipmentLoanStatus.js';

export interface UpdateEquipmentLoanRequest {
  itemName?: string;
  dueDate?: string;
  status?: EquipmentLoanStatus;
}
