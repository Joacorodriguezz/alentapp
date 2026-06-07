export class SportDomainService {
    enrollmentRepo;
    constructor(enrollmentRepo) {
        this.enrollmentRepo = enrollmentRepo;
    }
    async validateNoActiveEnrollments(sportId) {
        const hasActive = await this.enrollmentRepo.hasActiveEnrollmentsBySport(sportId);
        if (hasActive) {
            throw new Error('No se puede eliminar: existen inscripciones activas');
        }
    }
}
