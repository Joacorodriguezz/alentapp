export class GetEquipmentLoanByIdUseCase {
    equipmentLoanRepo;
    constructor(equipmentLoanRepo) {
        this.equipmentLoanRepo = equipmentLoanRepo;
    }
    async execute(id) {
        const loan = await this.equipmentLoanRepo.findById(id);
        if (!loan) {
            throw new Error('El préstamo solicitado no fue encontrado.');
        }
        return loan;
    }
}
