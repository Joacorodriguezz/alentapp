export class DeleteDisciplineUseCase {
    disciplineRepository;
    disciplineValidator;
    constructor(disciplineRepository, disciplineValidator) {
        this.disciplineRepository = disciplineRepository;
        this.disciplineValidator = disciplineValidator;
    }
    async execute(id) {
        // Validar que la sanción existe
        const existingDiscipline = await this.disciplineRepository.findById(id);
        if (!existingDiscipline) {
            throw new Error('La sanción no existe');
        }
        // Validar que no esté ya eliminada (regla: no se puede eliminar lo ya eliminado)
        this.disciplineValidator.validateCanDelete(existingDiscipline.deletedAt);
        // Realizar eliminación lógica
        await this.disciplineRepository.softDelete(id);
        // Retornar la sanción actualizada con el timestamp de eliminación
        const deletedDiscipline = await this.disciplineRepository.findById(id);
        return deletedDiscipline;
    }
}
