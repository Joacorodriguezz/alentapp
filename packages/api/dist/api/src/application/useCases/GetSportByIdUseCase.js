export class GetSportByIdUseCase {
    sportRepository;
    constructor(sportRepository) {
        this.sportRepository = sportRepository;
    }
    async execute(id) {
        const sport = await this.sportRepository.findById(id);
        if (!sport) {
            throw new Error('Deporte no encontrado');
        }
        return sport;
    }
}
