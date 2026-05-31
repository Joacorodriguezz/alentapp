import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CreateEquipmentLoanUseCase } from '../useCases/CreateEquipmentLoanUseCase.js';
import { IEquipmentLoanRepository } from '../ports/IEquipmentLoanRepository.js';
import { IMemberRepository } from '../ports/IMemberRepository.js';
import { EquipmentLoanStatus } from '@alentapp/shared';

// ────────────────────────────────────────────────────────
// Mocks de los puertos de salida (sin base de datos real)
// ────────────────────────────────────────────────────────
const mockEquipmentLoanRepo = {
    save: vi.fn(),
} as unknown as IEquipmentLoanRepository;

const mockMemberRepo = {
    findById: vi.fn(),
} as unknown as IMemberRepository;

const useCase = new CreateEquipmentLoanUseCase(mockEquipmentLoanRepo, mockMemberRepo);

// Fecha de devolución siempre futura
const futureDueDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

describe('CreateEquipmentLoanUseCase', () => {

    beforeEach(() => {
        vi.clearAllMocks();
    });

    // U-08: Ruta de error — socio inexistente en el repositorio
    // TDD-0016: "Socio inexistente" → 404 Not Found
    it('U-08: debe lanzar error si el socio no existe en el repositorio (findById devuelve null)', async () => {
        // Given: el repositorio no encuentra al socio
        vi.mocked(mockMemberRepo.findById).mockResolvedValueOnce(null);

        // When / Then
        await expect(
            useCase.execute({
                itemName: 'Pelota de Fútbol',
                dueDate: futureDueDate,
                memberId: 'id-inexistente',
            })
        ).rejects.toThrow('El socio solicitado no se encuentra registrado en el sistema.');

        // Verificación adicional: nunca se debería intentar persistir
        expect(mockEquipmentLoanRepo.save).not.toHaveBeenCalled();
    });

    // U-09: Ruta de error — socio con categoría Cadete (no autorizado)
    // TDD-0016: "Socio no autorizado (Cadete)" → 403 Forbidden
    it('U-09: debe lanzar error si el socio tiene categoría Cadete (no está autorizado)', async () => {
        // Given: el repositorio devuelve un socio con categoría Cadete
        vi.mocked(mockMemberRepo.findById).mockResolvedValueOnce({
            id: 'member-cadet',
            name: 'Socio Cadete',
            category: 'Cadete',
        } as any);

        // When / Then
        await expect(
            useCase.execute({
                itemName: 'Raqueta de Tenis',
                dueDate: futureDueDate,
                memberId: 'member-cadet',
            })
        ).rejects.toThrow('Los socios categoría Cadete no tienen permitido solicitar material.');

        expect(mockEquipmentLoanRepo.save).not.toHaveBeenCalled();
    });

    // U-10: Happy path — socio Pleno válido, préstamo creado y persistido
    // TDD-0016: flujo exitoso completo
    it('U-10: debe crear y persistir el préstamo exitosamente para un socio con categoría Pleno', async () => {
        // Given: el repositorio devuelve un socio válido (categoría Pleno)
        vi.mocked(mockMemberRepo.findById).mockResolvedValueOnce({
            id: 'member-pleno',
            name: 'Socio Pleno',
            category: 'Pleno',
        } as any);
        vi.mocked(mockEquipmentLoanRepo.save).mockResolvedValueOnce(undefined);

        // When
        const result = await useCase.execute({
            itemName: 'Pelota de Básquet Spalding',
            dueDate: futureDueDate,
            memberId: 'member-pleno',
        });

        // Then: el préstamo creado respeta los invariantes del dominio
        expect(result.status).toBe(EquipmentLoanStatus.Loaned);
        expect(result.deletedAt).toBeNull();
        expect(result.memberId).toBe('member-pleno');
        expect(mockEquipmentLoanRepo.save).toHaveBeenCalledOnce();
        expect(mockEquipmentLoanRepo.save).toHaveBeenCalledWith(result);
    });
});
