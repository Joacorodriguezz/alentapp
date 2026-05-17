import { Sport } from '../../domain/entities/Sport.js';


type PersistenceSport = {
    id: string;
    name: string;
    description: string | null;
    maxCapacity: number;
    additionalPrice: number | null;
    requiresMedicalCertificate: boolean;
};

export class SportPersistenceMapper {
    static toPersistence(sport: Sport) {
        return {
            name: sport.name,
            description: sport.description,
            maxCapacity: sport.maxCapacity,
            additionalPrice: sport.additionalPrice,
            requiresMedicalCertificate: sport.requiresMedicalCertificate,
        };
    }

    static toDomain(sport: PersistenceSport): Sport {
        return new Sport({
            id: sport.id,
            name: sport.name,
            description: sport.description,
            maxCapacity: sport.maxCapacity,
            additionalPrice: sport.additionalPrice,
            requiresMedicalCertificate: sport.requiresMedicalCertificate,
        });
    }
}
