export class GetDisciplinesUseCase {
    disciplineRepository;
    constructor(disciplineRepository) {
        this.disciplineRepository = disciplineRepository;
    }
    async execute(filters) {
        return this.disciplineRepository.findAll(filters);
    }
}
