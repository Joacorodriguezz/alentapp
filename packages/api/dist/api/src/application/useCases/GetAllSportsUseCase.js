export class GetAllSportsUseCase {
    sportRepository;
    constructor(sportRepository) {
        this.sportRepository = sportRepository;
    }
    async execute(filters) {
        return this.sportRepository.findAll(filters);
    }
}
