import { IEquipmentLoanRepository } from '../ports/IEquipmentLoanRepository.js';
import { EquipmentLoan } from '../../domain/entities/EquipmentLoan.js';

export class GetEquipmentLoanByIdUseCase {
  constructor(private readonly equipmentLoanRepo: IEquipmentLoanRepository) {}

  async execute(id: string): Promise<EquipmentLoan> {
    const loan = await this.equipmentLoanRepo.findById(id);
    if (!loan) {
      throw new Error('El préstamo solicitado no fue encontrado.');
    }
    return loan;
  }
}
