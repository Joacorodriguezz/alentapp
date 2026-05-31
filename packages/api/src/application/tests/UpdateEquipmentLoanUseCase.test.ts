import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UpdateEquipmentLoanUseCase } from '../useCases/UpdateEquipmentLoanUseCase.js';
import { IEquipmentLoanRepository } from '../ports/IEquipmentLoanRepository.js';

// ────────────────────────────────────────────────────────
// Mock del puerto de salida (sin base de datos real)
// ────────────────────────────────────────────────────────
const mockEquipmentLoanRepo = {
    findById: vi.fn(),
    update: vi.fn(),
} as unknown as IEquipmentLoanRepository;

const useCase = new UpdateEquipmentLoanUseCase(mockEquipmentLoanRepo);

describe('UpdateEquipmentLoanUseCase', () => {

    beforeEach(() => {
        vi.clearAllMocks();
    });

    // U-11: Ruta de error — préstamo inexistente o eliminado lógicamente
    // TDD-0017: "Préstamo inexistente o eliminado" → 404 Not Found
    // Nota: findById ya filtra por deletedAt = null en el repositorio,
    // por lo que un préstamo eliminado también devuelve null aquí.
    it('U-11: debe lanzar error si el préstamo no existe o fue eliminado (findById devuelve null)', async () => {
        // Given: el repositorio no encuentra el préstamo (inexistente o ya dado de baja)
        vi.mocked(mockEquipmentLoanRepo.findById).mockResolvedValueOnce(null);

        // When / Then
        await expect(
            useCase.execute('id-inexistente', { itemName: 'Nuevo ítem' })
        ).rejects.toThrow('El préstamo que intenta actualizar no existe en el sistema.');

        // Verificación: nunca se debe intentar persistir si el préstamo no existe
        expect(mockEquipmentLoanRepo.update).not.toHaveBeenCalled();
    });
});
