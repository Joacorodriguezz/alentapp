import { ISportRepository } from '../ports/ISportRepository.js';
import { Sport } from '../../domain/entities/Sport.js';
import type { SportFilters } from '@alentapp/shared';

export class GetAllSportsUseCase {
    constructor(private readonly sportRepository: ISportRepository) {}

    async execute(filters?: SportFilters): Promise<Sport[]> {
        return this.sportRepository.findAll(filters);
    }
}
