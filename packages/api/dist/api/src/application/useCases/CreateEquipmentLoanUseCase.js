import { EquipmentLoan } from '../../domain/entities/EquipmentLoan.js';
export class CreateEquipmentLoanUseCase {
    equipmentLoanRepository;
    memberRepository;
    // Inyección de dependencias (Puertos)
    constructor(equipmentLoanRepository, memberRepository) {
        this.equipmentLoanRepository = equipmentLoanRepository;
        this.memberRepository = memberRepository;
    }
    async execute(request) {
        // 1. Consultar los datos del socio
        const member = await this.memberRepository.findById(request.memberId);
        if (!member) {
            throw new Error('El socio solicitado no se encuentra registrado en el sistema.');
        }
        // 2. Aplicar la restricción de categoría
        if (member.category !== 'Pleno' && member.category !== 'Honorario') {
            throw new Error('Los socios categoría Cadete no tienen permitido solicitar material.');
        }
        // 3. Instanciar la Entidad de Dominio (El 'create' valida la fecha internamente)
        const dueDateObj = new Date(request.dueDate);
        const newId = globalThis.crypto.randomUUID();
        const loan = EquipmentLoan.create(newId, request.itemName, dueDateObj, request.memberId);
        // 4. Persistir la nueva entidad
        await this.equipmentLoanRepository.save(loan);
        // Retornamos la entidad para que el Controlador la mapee al DTO de respuesta
        return loan;
    }
}
