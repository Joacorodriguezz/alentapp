export class UpdateEquipmentLoanUseCase {
    equipmentLoanRepository;
    constructor(equipmentLoanRepository) {
        this.equipmentLoanRepository = equipmentLoanRepository;
    }
    async execute(id, data) {
        // 1. Buscar el préstamo existente
        const loan = await this.equipmentLoanRepository.findById(id);
        if (!loan) {
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
