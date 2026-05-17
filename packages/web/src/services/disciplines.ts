import type {
  DisciplineResponse,
  CreateDisciplineRequest,
  DisciplineFilters,
} from '@alentapp/shared';

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3000') + '/api/v1';

export const disciplinesService = {
  async getAll(filters?: DisciplineFilters): Promise<DisciplineResponse[]> {
    const params = new URLSearchParams();
    if (filters?.memberId) {
      params.set('memberId', filters.memberId);
    }
    if (filters?.onlyActive) {
      params.set('onlyActive', 'true');
    }
    const query = params.toString();
    const url = `${API_URL}/disciplines${query ? `?${query}` : ''}`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Error al obtener las disciplinas');
    }
    const result = await response.json();
    return result.data;
  },

  async getById(id: string): Promise<DisciplineResponse> {
    const response = await fetch(`${API_URL}/disciplines/${id}`);
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Error al obtener la disciplina');
    }
    const result = await response.json();
    return result.data;
  },

  async create(data: CreateDisciplineRequest): Promise<DisciplineResponse> {
    const response = await fetch(`${API_URL}/disciplines`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Error al crear la disciplina');
    }
    const result = await response.json();
    return result.data;
  },

  async update(id: string, data: Partial<CreateDisciplineRequest>): Promise<DisciplineResponse> {
    const response = await fetch(`${API_URL}/disciplines/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Error al actualizar la disciplina');
    }
    const result = await response.json();
    return result.data;
  },

  async delete(id: string): Promise<void> {
    const response = await fetch(`${API_URL}/disciplines/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Error al eliminar la disciplina');
    }
  },
};
