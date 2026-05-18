import { EquipmentLoan } from '../../domain/entities/EquipmentLoan.js';
import { EquipmentLoanResponse } from '@alentapp/shared';

export class EquipmentLoanDTOMapper {
  // Extrae solo los datos públicos de la Entidad para enviarlos al Frontend
  static toDTO(entity: EquipmentLoan): EquipmentLoanResponse {
    return {
      id: entity.id,
      itemName: entity.itemName,
      status: entity.status,
      loanDate: entity.loanDate.toISOString(), // Convertimos Date a String para el JSON
      dueDate: entity.dueDate.toISOString(),
      memberId: entity.memberId,
    };
  }
}