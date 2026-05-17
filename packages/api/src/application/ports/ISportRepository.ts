import { Sport } from '../../domain/entities/Sport.js';

export interface ISportRepository {
    create(sport: Sport): Promise<Sport>;
    findByName(name: string): Promise<Sport | null>;
}
