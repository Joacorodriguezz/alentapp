import type { CreateMedicalCertificateRequest, UpdateMedicalCertificateRequest, MedicalCertificate } from '@alentapp/shared';

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3000') + '/api/v1';

export const medicalCertificatesService = {
  async create(data: CreateMedicalCertificateRequest): Promise<MedicalCertificate> {
    const response = await fetch(`${API_URL}/medical-certificates`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Error al registrar el certificado médico');
    }
    const result = await response.json();
    return result.data;
  },

  async getByMember(memberId: string, soloVigente?: boolean): Promise<MedicalCertificate[]> {
    const params = new URLSearchParams({ memberId: memberId });
    if (soloVigente) params.set('soloVigente', 'true');
    const response = await fetch(`${API_URL}/medical-certificates?${params}`);
    const result = await response.json();
    if (result.error) {
      throw new Error(result.error);
    }
    return result.data;
  },

  async getById(id: string): Promise<MedicalCertificate> {
    const response = await fetch(`${API_URL}/medical-certificates/${id}`);
    const result = await response.json();
    if (result.error) {
      throw new Error(result.error);
    }
    return result.data;
  },

  async update(id: string, data: UpdateMedicalCertificateRequest): Promise<MedicalCertificate> {
    const response = await fetch(`${API_URL}/medical-certificates/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Error al actualizar el certificado médico');
    }
    const result = await response.json();
    return result.data;
  },

  async logicalDelete(id: string): Promise<void> {
    const response = await fetch(`${API_URL}/medical-certificates/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Error al anular el certificado médico');
    }
  },
};
