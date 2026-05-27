export interface IEnrollmentRepository {
    hasActiveEnrollmentsBySport(sportId: string): Promise<boolean>;
}