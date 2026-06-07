export class SportValidator {
    sportRepository;
    constructor(sportRepository) {
        this.sportRepository = sportRepository;
    }
    async validateNameIsUnique(name) {
        const sport = await this.sportRepository.findByName(name);
        if (sport) {
            throw new Error('El deporte ya existe');
        }
    }
}
