import { EquipmentLoan } from '../../domain/entities/EquipmentLoan.js';
import { EquipmentLoanStatus } from '@alentapp/shared';

export class EquipmentLoanPersistenceMapper {
  // Transforma el registro crudo de Prisma en tu Entidad de Dominio
  static toDomain(rawDbData: any): EquipmentLoan {
    return new EquipmentLoan(
      rawDbData.id,
      rawDbData.itemName,
      rawDbData.status as EquipmentLoanStatus,
      rawDbData.loanDate,
      rawDbData.dueDate,
      rawDbData.memberId,
      rawDbData.deletedAt
    );
  }

  // Transforma tu Entidad de Dominio en un objeto listo para guardar en Prisma
  static toPersistence(entity: EquipmentLoan): any {
    return {
      id: entity.id,
      itemName: entity.itemName,
      status: entity.status,
      loanDate: entity.loanDate,
      dueDate: entity.dueDate,
      memberId: entity.memberId,
      deletedAt: entity.deletedAt,
    };
  }
}