export class DeleteSportUseCase {
    sportRepo;
    sportDomainService;
    constructor(sportRepo, sportDomainService) {
        this.sportRepo = sportRepo;
        this.sportDomainService = sportDomainService;
    }
    async execute(id) {
        const sport = await this.sportRepo.findById(id);
        if (!sport) {
            throw new Error('Deporte no encontrado');
        }
        await this.sportDomainService.validateNoActiveEnrollments(id);
        await this.sportRepo.delete(id);
    }
}
