import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UpdateMedicalCertificateUseCase } from '../useCases/UpdateMedicalCertificateUseCase.js';
import { IMedicalCertificateRepository } from '../ports/IMedicalCertificateRepository.js';
import { IMemberRepository } from '../ports/IMemberRepository.js';
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

function makeMemberRepo(): IMemberRepository {
    return {
        findByDni: vi.fn(),
        findById: vi.fn(),
        findAll: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
    } as unknown as IMemberRepository;
}

// ============================================================
// UpdateMedicalCertificateUseCase — TDD-0021
// ============================================================
describe('UpdateMedicalCertificateUseCase — TDD-0021', () => {
    const mockCertRepo = makeCertRepo();
    const mockMemberRepo = makeMemberRepo();
    const useCase = new UpdateMedicalCertificateUseCase(mockCertRepo, mockMemberRepo);

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('[UT-12] debe lanzar "Certificado no encontrado" si el ID no existe en el repositorio', async () => {
        vi.mocked(mockCertRepo.findById).mockResolvedValueOnce(null);

        await expect(
            useCase.execute('uuid-inexistente', { issueDate: '2025-01-01' })
        ).rejects.toThrow('Certificado no encontrado');

        expect(mockCertRepo.update).not.toHaveBeenCalled();
    });

    it('[UT-13] debe lanzar error de rango si la nueva expiryDate es anterior a la issueDate efectiva', async () => {
        // El certificado existente tiene issueDate: '2025-01-01'
        vi.mocked(mockCertRepo.findById).mockResolvedValueOnce(MOCK_CERTIFICATE);

        await expect(
            useCase.execute('uuid-cert-1', {
                expiryDate: '2024-06-01', // anterior a issueDate '2025-01-01'
            })
        ).rejects.toThrow('La fecha de vencimiento no puede ser anterior a la de la emisión');

        expect(mockCertRepo.update).not.toHaveBeenCalled();
    });
});
