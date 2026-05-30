import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SportDomainService } from '../services/SportDomainService.js';
import { IEnrollmentRepository } from '../../application/ports/IEnrollmentRepository.js';

describe('SportDomainService', () => {
    const mockEnrollmentRepository = {
        hasActiveEnrollmentsBySport: vi.fn(),
    } as unknown as IEnrollmentRepository;

    const service = new SportDomainService(mockEnrollmentRepository);

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('debe pasar si no hay inscripciones activas', async () => {
        vi.mocked(mockEnrollmentRepository.hasActiveEnrollmentsBySport).mockResolvedValueOnce(false);

        await expect(
            service.validateNoActiveEnrollments('550e8400-e29b-41d4-a716-446655440000'),
        ).resolves.toBeUndefined();
    });

    it('debe lanzar error si existen inscripciones activas', async () => {
        vi.mocked(mockEnrollmentRepository.hasActiveEnrollmentsBySport).mockResolvedValueOnce(true);

        await expect(
            service.validateNoActiveEnrollments('550e8400-e29b-41d4-a716-446655440000'),
        ).rejects.toThrow('No se puede eliminar: existen inscripciones activas');
    });
});
