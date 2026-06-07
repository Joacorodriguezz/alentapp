export class DeleteEquipmentLoanUseCase {
    equipmentLoanRepo;
    constructor(equipmentLoanRepo) {
        this.equipmentLoanRepo = equipmentLoanRepo;
    }
    async execute(id) {
        const loan = await this.equipmentLoanRepo.findById(id);
        if (!loan) {
            throw new Error('El préstamo que intenta eliminar no se encuentra registrado.');
        }
        loan.delete();
        await this.equipmentLoanRepo.update(loan);
    }
}
