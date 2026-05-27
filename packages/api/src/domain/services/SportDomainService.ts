import { IEnrollmentRepository } from '../../application/ports/IEnrollmentRepository.js';
 
export class SportDomainService {
    constructor(private readonly enrollmentRepo: IEnrollmentRepository) {}
 
    async validateNoActiveEnrollments(sportId: string): Promise<void> {
        const hasActive = await this.enrollmentRepo.hasActiveEnrollmentsBySport(sportId);
        if (hasActive) {
            throw new Error('No se puede eliminar: existen inscripciones activas');
        }
    }
}