export class UpdateSportUseCase {
    sportRepository;
    constructor(sportRepository) {
        this.sportRepository = sportRepository;
    }
    async execute(id, data) {
        const sport = await this.sportRepository.findById(id);
        if (!sport) {
            throw new Error('Deporte no encontrado');
        }
        return this.sportRepository.update(id, sport.update(data));
    }
}
