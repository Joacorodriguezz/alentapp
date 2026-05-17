import type { PaymentDTO, CreatePaymentRequest, PaymentFilters, UpdatePaymentRequest } from '@alentapp/shared';

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3000') + '/api/v1';

export const paymentsService = {
  async getAll(filters?: PaymentFilters): Promise<PaymentDTO[]> {
    const params = new URLSearchParams();
    if (filters?.memberId) params.set('memberId', filters.memberId);
    if (filters?.status) params.set('status', filters.status);
    const query = params.toString() ? `?${params.toString()}` : '';
    const response = await fetch(`${API_URL}/payments${query}`);
    if (!response.ok) {
      throw new Error('Error al obtener los pagos');
    }
    const result = await response.json();
    return result.data;
  },

  async getById(id: string): Promise<PaymentDTO> {
    const response = await fetch(`${API_URL}/payments/${id}`);
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Error al obtener el pago');
    }
    const result = await response.json();
    return result.data;
  },

  async create(data: CreatePaymentRequest): Promise<PaymentDTO> {
    const response = await fetch(`${API_URL}/payments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Error al registrar el pago');
    }
    const result = await response.json();
    return result.data;
  },

  async update(id: string, data: UpdatePaymentRequest): Promise<PaymentDTO> {
    const response = await fetch(`${API_URL}/payments/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Error al actualizar el pago');
    }
    const result = await response.json();
    return result.data;
  },
};
