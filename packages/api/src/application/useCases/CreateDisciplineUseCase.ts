import { IDisciplineRepository } from '../ports/IDisciplineRepository.js';
import { DisciplineValidator } from '../../domain/services/DisciplineValidator.js';
import { Discipline } from '../../domain/entities/Discipline.js';
import { DisciplineResponse, CreateDisciplineRequest } from '@alentapp/shared';
import { IMemberRepository } from '../ports/IMemberRepository.js';

export class CreateDisciplineUseCase {
    constructor(
        private readonly disciplineRepository: IDisciplineRepository,
        private readonly disciplineValidator: DisciplineValidator,
        private readonly memberRepository: IMemberRepository
    ) { }

    async execute(data: CreateDisciplineRequest): Promise<DisciplineResponse> {
        // Validar formato de fechas (validación HTTP/tipo)
        this.disciplineValidator.validateDateFormat(data.startDate);
        this.disciplineValidator.validateDateFormat(data.endDate);

        // Validar existencia del socio (requiere consultar BD)
        const member = await this.memberRepository.findById(data.memberId);
        if (!member) {
            throw new Error('El socio indicado no existe');
        }

        // Crear la entidad - validará invariantes propios (reason, fechas)
        const discipline = Discipline.create(
            crypto.randomUUID(),
            data.reason,
            data.startDate,
            data.endDate,
            data.isTotalSuspension,
            data.memberId,
        );

        return this.disciplineRepository.create({
            reason: discipline.reason,
            startDate: discipline.startDate,
            endDate: discipline.endDate,
            isTotalSuspension: discipline.isTotalSuspension,
            memberId: discipline.memberId,
        });
    }
}
