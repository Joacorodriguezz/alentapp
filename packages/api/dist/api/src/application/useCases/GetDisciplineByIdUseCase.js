export class GetDisciplineByIdUseCase {
    disciplineRepository;
    constructor(disciplineRepository) {
        this.disciplineRepository = disciplineRepository;
    }
    async execute(id) {
        const discipline = await this.disciplineRepository.findById(id);
        if (!discipline) {
            throw new Error('La sanción no existe');
        }
        return discipline;
    }
}
