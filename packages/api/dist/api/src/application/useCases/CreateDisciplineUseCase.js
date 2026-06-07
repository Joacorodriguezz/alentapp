import { Discipline } from '../../domain/entities/Discipline.js';
export class CreateDisciplineUseCase {
    disciplineRepository;
    disciplineValidator;
    memberRepository;
    constructor(disciplineRepository, disciplineValidator, memberRepository) {
        this.disciplineRepository = disciplineRepository;
        this.disciplineValidator = disciplineValidator;
        this.memberRepository = memberRepository;
    }
    async execute(data) {
        // Validar formato de fechas (validación HTTP/tipo)
        this.disciplineValidator.validateDateFormat(data.startDate);
        this.disciplineValidator.validateDateFormat(data.endDate);
        // Validar existencia del socio (requiere consultar BD)
        const member = await this.memberRepository.findById(data.memberId);
        if (!member) {
            throw new Error('El socio indicado no existe');
        }
        // Crear la entidad - validará invariantes propios (reason, fechas)
        const discipline = Discipline.create(crypto.randomUUID(), data.reason, data.startDate, data.endDate, data.isTotalSuspension, data.memberId);
        return this.disciplineRepository.create({
            reason: discipline.reason,
            startDate: discipline.startDate,
            endDate: discipline.endDate,
            isTotalSuspension: discipline.isTotalSuspension,
            memberId: discipline.memberId,
        });
    }
}
