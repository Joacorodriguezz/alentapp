import type { CreateEquipmentLoanRequest, EquipmentLoanResponse } from '@alentapp/shared';

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3000') + '/api/v1';

export const equipmentLoansService = {
  async create(data: CreateEquipmentLoanRequest): Promise<EquipmentLoanResponse> {
    const response = await fetch(`${API_URL}/equipment-loans`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Error al registrar el préstamo');
    }
    const result = await response.json();
    return result.data;
  },
};
