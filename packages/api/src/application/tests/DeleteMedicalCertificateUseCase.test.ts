import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DeleteMedicalCertificateUseCase } from '../useCases/DeleteMedicalCertificateUseCase.js';
import { IMedicalCertificateRepository } from '../ports/IMedicalCertificateRepository.js';
import { MedicalCertificate } from '../../domain/entities/MedicalCertificate.js';

const MOCK_CERTIFICATE = new MedicalCertificate(
    'uuid-cert-1',
    '2025-01-01',
    '2026-01-01',
    'MP 12345',
    'Hospital San Martín',
    true,
    'uuid-member-1',
);

function makeCertRepo(): IMedicalCertificateRepository {
    return {
        save: vi.fn(),
        invalidatePreviousCertificates: vi.fn(),
        findById: vi.fn(),
        findAllByMember: vi.fn(),
        findActiveByMember: vi.fn(),
        update: vi.fn(),
        logicalDelete: vi.fn(),
    } as unknown as IMedicalCertificateRepository;
}

describe('DeleteMedicalCertificateUseCase', () => {
    const mockCertRepo = makeCertRepo();
    const useCase = new DeleteMedicalCertificateUseCase(mockCertRepo);

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('[UT-14] debe lanzar "Certificado no encontrado" si el ID no existe', async () => {
        vi.mocked(mockCertRepo.findById).mockResolvedValueOnce(null);

        await expect(useCase.execute('uuid-inexistente')).rejects.toThrow('Certificado no encontrado');


        expect(mockCertRepo.logicalDelete).not.toHaveBeenCalled();
    });

    it('[UT-15] debe llamar a logicalDelete (borrado lógico) si el certificado existe', async () => {
        vi.mocked(mockCertRepo.findById).mockResolvedValueOnce(MOCK_CERTIFICATE);
        vi.mocked(mockCertRepo.logicalDelete).mockResolvedValueOnce(undefined);

        await useCase.execute('uuid-cert-1');


        expect(mockCertRepo.logicalDelete).toHaveBeenCalledOnce();
        expect(mockCertRepo.logicalDelete).toHaveBeenCalledWith('uuid-cert-1');
    });
});
