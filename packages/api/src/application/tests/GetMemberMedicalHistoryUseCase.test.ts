import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GetMemberMedicalHistoryUseCase } from '../useCases/GetMemberMedicalHistoryUseCase.js';
import { IMedicalCertificateRepository } from '../ports/IMedicalCertificateRepository.js';
import { IMemberRepository } from '../ports/IMemberRepository.js';

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
// GetMemberMedicalHistoryUseCase — TDD-0029
// ============================================================
describe('GetMemberMedicalHistoryUseCase — TDD-0029', () => {
    const mockCertRepo = makeCertRepo();
    const mockMemberRepo = makeMemberRepo();
    const useCase = new GetMemberMedicalHistoryUseCase(mockCertRepo, mockMemberRepo);

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('[UT-16] debe lanzar "Socio no encontrado" si el DNI no corresponde a ningún socio', async () => {
        vi.mocked(mockMemberRepo.findByDni).mockResolvedValueOnce(null);

        await expect(useCase.execute('99999999'))
            .rejects.toThrow('Socio no encontrado');

        expect(mockCertRepo.findAllByMember).not.toHaveBeenCalled();
    });
});
