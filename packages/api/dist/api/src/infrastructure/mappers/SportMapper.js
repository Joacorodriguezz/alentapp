import { Sport } from '../../domain/entities/Sport.js';
export class SportMapper {
    static fromDB(record) {
        return new Sport(record.id, record.name, record.description, record.maxCapacity, record.additionalPrice, record.requiresMedicalCertificate);
    }
    static toPersistence(sport) {
        return {
            name: sport.name,
            description: sport.description,
            maxCapacity: sport.maxCapacity,
            additionalPrice: sport.additionalPrice,
            requiresMedicalCertificate: sport.requiresMedicalCertificate,
        };
    }
    static toDTO(sport) {
        if (!sport.id) {
            throw new Error('El deporte no tiene id');
        }
        return {
            id: sport.id,
            name: sport.name,
            description: sport.description,
            maxCapacity: sport.maxCapacity,
            additionalPrice: sport.additionalPrice,
            requiresMedicalCertificate: sport.requiresMedicalCertificate,
        };
    }
}
