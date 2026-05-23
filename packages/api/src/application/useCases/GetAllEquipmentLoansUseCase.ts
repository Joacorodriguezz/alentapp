import { IEquipmentLoanRepository } from '../ports/IEquipmentLoanRepository.js';
import { EquipmentLoan } from '../../domain/entities/EquipmentLoan.js';

export class GetAllEquipmentLoansUseCase {
  constructor(private readonly equipmentLoanRepo: IEquipmentLoanRepository) {}

  async execute(): Promise<EquipmentLoan[]> {
    return await this.equipmentLoanRepo.findAll();
  }
}
