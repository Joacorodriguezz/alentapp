import type { SportFilters } from '@alentapp/shared';
import { Sport } from '../../domain/entities/Sport.js';

export interface ISportRepository {
    create(sport: Sport): Promise<Sport>;
    findAll(filters?: SportFilters): Promise<Sport[]>;
    findById(id: string): Promise<Sport | null>;
    findByName(name: string): Promise<Sport | null>;
    update(id: string, sport: Sport): Promise<Sport>;
}
