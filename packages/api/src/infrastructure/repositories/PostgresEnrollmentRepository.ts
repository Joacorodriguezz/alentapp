import { IEnrollmentRepository } from '../../application/ports/IEnrollmentRepository.js';
 
// Stub temporal: la entidad Enrollment no esta implementada en esta iteracion.
// Cuando se implemente, reemplazar este metodo con la consulta real a Prisma.
// La arquitectura ya esta preparada para ese cambio sin modificar nada mas.
export class PostgresEnrollmentRepository implements IEnrollmentRepository {
    async hasActiveEnrollmentsBySport(_sportId: string): Promise<boolean> {
        return false;
    }
}