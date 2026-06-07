export class GetAllEquipmentLoansUseCase {
    equipmentLoanRepo;
    constructor(equipmentLoanRepo) {
        this.equipmentLoanRepo = equipmentLoanRepo;
    }
    async execute() {
        return await this.equipmentLoanRepo.findAll();
    }
}
