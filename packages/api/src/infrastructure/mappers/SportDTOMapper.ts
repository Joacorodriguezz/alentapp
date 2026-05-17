import { SportResponse  } from '@alentapp/shared';
import { Sport } from '../../domain/entities/Sport.js';

export class SportDTOMapper {
    static toDTO(sport: Sport): SportResponse  {
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