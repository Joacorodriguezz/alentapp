import type { CreateSportRequest, SportFilters, SportResponse, UpdateSportRequest } from '@alentapp/shared';

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3000') + '/api/v1';

export const sportsService = {
  async list(filters?: SportFilters): Promise<SportResponse[]> {
    const query = new URLSearchParams();

    if (filters?.requiresMedicalCertificate !== undefined) {
      query.set('requiresMedicalCertificate', String(filters.requiresMedicalCertificate));
    }

    const queryString = query.toString();
    const url = queryString ? `${API_URL}/sports?${queryString}` : `${API_URL}/sports`;
    const response = await fetch(url);

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Error al listar los deportes');
    }

    const result = await response.json();
    return result.data;
  },

  async getById(id: string): Promise<SportResponse> {
    const response = await fetch(`${API_URL}/sports/${id}`);

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Error al obtener el deporte');
    }

    return response.json();
  },

  async findByName(name: string): Promise<SportResponse> {
    const normalizedName = name.trim().toLocaleLowerCase();
    const sports = await this.list();
    const sport = sports.find((item) => item.name.trim().toLocaleLowerCase() === normalizedName);

    if (!sport) {
      throw new Error('Deporte no encontrado');
    }

    return sport;
  },

  async create(data: CreateSportRequest): Promise<SportResponse> {
    const response = await fetch(`${API_URL}/sports`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Error al crear el deporte');
    }

    const result = await response.json();
    return result.data;
  },

  async update(id: string, data: UpdateSportRequest): Promise<SportResponse> {
    const response = await fetch(`${API_URL}/sports/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Error al actualizar el deporte');
    }

    const result = await response.json();
    return result.data;
  },
};
