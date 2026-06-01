import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CreateMedicalCertificateUseCase } from '../useCases/CreateMedicalCertificateUseCase.js';
import { IMedicalCertificateRepository } from '../ports/IMedicalCertificateRepository.js';
import { IMemberRepository } from '../ports/IMemberRepository.js';
import { MedicalCertificate } from '../../domain/entities/MedicalCertificate.js';

// --------------- Fixtures reutilizables ---------------
const MOCK_MEMBER = {
    id: 'uuid-member-1',
    dni: '12345678',
    name: 'Juan Perez',
    email: 'juan@test.com',
    birthdate: '1990-01-01',
    category: 'Pleno',
    status: 'Activo',
    created_at: '2026-01-01T00:00:00.000Z',
};

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
// CreateMedicalCertificateUseCase — TDD-0020
// ============================================================
describe('CreateMedicalCertificateUseCase — TDD-0020', () => {
    const mockCertRepo = makeCertRepo();
    const mockMemberRepo = makeMemberRepo();
    const useCase = new CreateMedicalCertificateUseCase(mockCertRepo, mockMemberRepo);

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('[UT-09] debe lanzar "Datos inválidos" si algún campo obligatorio del DTO está vacío', async () => {
        await expect(
            useCase.execute({
                issueDate: '2025-01-01',
                expiryDate: '2026-01-01',
                doctorLicence: '',          // campo vacío
                institution: 'Hospital',
                dni: '12345678',
            })
        ).rejects.toThrow('Datos inválidos');

        // El repositorio NO debe haber sido llamado
        expect(mockCertRepo.save).not.toHaveBeenCalled();
    });

    it('[UT-10] debe lanzar "Socio no encontrado" si el DNI no corresponde a ningún socio', async () => {
        vi.mocked(mockMemberRepo.findByDni).mockResolvedValueOnce(null);

        await expect(
            useCase.execute({
                issueDate: '2025-01-01',
                expiryDate: '2026-01-01',
                doctorLicence: 'MP 12345',
                institution: 'Hospital San Martín',
                dni: '99999999',
            })
        ).rejects.toThrow('Socio no encontrado');

        expect(mockCertRepo.invalidatePreviousCertificates).not.toHaveBeenCalled();
        expect(mockCertRepo.save).not.toHaveBeenCalled();
    });

    it('[UT-11] debe invalidar certificados previos y persistir el nuevo al recibir datos válidos', async () => {
        vi.mocked(mockMemberRepo.findByDni).mockResolvedValueOnce(MOCK_MEMBER as any);
        vi.mocked(mockCertRepo.invalidatePreviousCertificates).mockResolvedValueOnce(undefined);
        vi.mocked(mockCertRepo.save).mockResolvedValueOnce(MOCK_CERTIFICATE);

        const result = await useCase.execute({
            issueDate: '2025-01-01',
            expiryDate: '2026-01-01',
            doctorLicence: 'MP 12345',
            institution: 'Hospital San Martín',
            dni: '12345678',
        });

        // Criterio TDD-0020: "Al crear uno nuevo, el sistema debe invalidar
        // automáticamente los registros anteriores"
        expect(mockCertRepo.invalidatePreviousCertificates).toHaveBeenCalledOnce();
        expect(mockCertRepo.invalidatePreviousCertificates).toHaveBeenCalledWith(MOCK_MEMBER.id);

        // El save debe recibir el UUID interno del socio (no el DNI público)
        expect(mockCertRepo.save).toHaveBeenCalledWith(
            expect.objectContaining({ memberId: MOCK_MEMBER.id })
        );

        expect(result.certificate).toBe(MOCK_CERTIFICATE);
        expect(result.dni).toBe(MOCK_MEMBER.dni);
    });
});
