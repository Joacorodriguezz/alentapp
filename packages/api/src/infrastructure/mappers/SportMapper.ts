import { SportResponse } from '@alentapp/shared';
import { Sport } from '../../domain/entities/Sport.js';

export type DBSport = {
    id: string;
    name: string;
    description: string | null;
    maxCapacity: number;
    additionalPrice: number | null;
    requiresMedicalCertificate: boolean;
};

export class SportMapper {
    static fromDB(record: DBSport): Sport {
        return new Sport(
            record.id,
            record.name,
            record.description,
            record.maxCapacity,
            record.additionalPrice,
            record.requiresMedicalCertificate,
        );
    }

    static toPersistence(sport: Sport) {
        return {
            name: sport.name,
            description: sport.description,
            maxCapacity: sport.maxCapacity,
            additionalPrice: sport.additionalPrice,
            requiresMedicalCertificate: sport.requiresMedicalCertificate,
        };
    }

    static toDTO(sport: Sport): SportResponse {
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
