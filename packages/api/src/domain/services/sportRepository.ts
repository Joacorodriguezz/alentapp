import { Sport } from '../entities/Sport.js';

export interface SportRepository {
    create(sport: Sport): Promise<Sport>;
    findByName(name: string): Promise<Sport | null>;
}