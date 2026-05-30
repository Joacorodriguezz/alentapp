import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DeleteEquipmentLoanUseCase } from '../useCases/DeleteEquipmentLoanUseCase.js';
import { IEquipmentLoanRepository } from '../ports/IEquipmentLoanRepository.js';

// ────────────────────────────────────────────────────────
// Mock del puerto de salida (sin base de datos real)
// ────────────────────────────────────────────────────────
const mockEquipmentLoanRepo = {
    findById: vi.fn(),
    update: vi.fn(),
} as unknown as IEquipmentLoanRepository;

const useCase = new DeleteEquipmentLoanUseCase(mockEquipmentLoanRepo);

describe('DeleteEquipmentLoanUseCase', () => {

    beforeEach(() => {
        vi.clearAllMocks();
    });

    // U-12: Ruta de error — préstamo inexistente o ya eliminado lógicamente
    // TDD-0018: "Préstamo inexistente" y "Préstamo ya eliminado previamente" → 404 Not Found
    // El repositorio devuelve null en ambos casos (filtra por deletedAt = null),
    // por lo que el caso de uso no distingue entre los dos escenarios: ambos son un 404.
    it('U-12: debe lanzar error si el préstamo no se encuentra (inexistente o ya eliminado)', async () => {
        // Given: el repositorio devuelve null (préstamo no existe o fue dado de baja)
        vi.mocked(mockEquipmentLoanRepo.findById).mockResolvedValueOnce(null);

        // When / Then
        await expect(
            useCase.execute('id-inexistente-o-eliminado')
        ).rejects.toThrow('El préstamo que intenta eliminar no se encuentra registrado.');

        // Verificación: la capa de persistencia no debe ser invocada
        expect(mockEquipmentLoanRepo.update).not.toHaveBeenCalled();
    });
});
