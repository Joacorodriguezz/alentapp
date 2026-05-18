import { IEquipmentLoanRepository } from '../ports/IEquipmentLoanRepository.js';
import { EquipmentLoan } from '../../domain/entities/EquipmentLoan.js';
import { UpdateEquipmentLoanRequest } from '@alentapp/shared';

export class UpdateEquipmentLoanUseCase {
  constructor(private readonly equipmentLoanRepository: IEquipmentLoanRepository) {}

  async execute(id: string, data: UpdateEquipmentLoanRequest): Promise<EquipmentLoan> {
    // 1. Buscar el préstamo existente
    const loan = await this.equipmentLoanRepository.findById(id);

    if (!loan || loan.deletedAt !== null) {
      throw new Error('El préstamo que intenta actualizar no existe en el sistema.');
    }

    // 2. Aplicar reglas de negocio de la entidad
    loan.updateInfo(data.itemName, data.dueDate);

    if (data.status !== undefined) {
      loan.changeStatus(data.status);
    }

    // 3. Persistir y retornar
    await this.equipmentLoanRepository.update(loan);

    return loan;
  }
}
