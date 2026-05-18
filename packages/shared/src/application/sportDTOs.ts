export interface CreateSportRequest {
    name: string;
    description?: string;
    maxCapacity: number;
    additionalPrice?: number;
    requiresMedicalCertificate?: boolean;
}

export interface UpdateSportRequest {
    description?: string;
    maxCapacity?: number;
    additionalPrice?: number;
    requiresMedicalCertificate?: boolean;
}

export interface SportFilters {
    requiresMedicalCertificate?: boolean;
}

export interface SportResponse {
    id: string;
    name: string;
    description: string | null;
    maxCapacity: number;
    additionalPrice: number | null;
    requiresMedicalCertificate: boolean;
}
