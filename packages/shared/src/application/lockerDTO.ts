import type { LockerDTO } from '../domain/locker.js';

export interface CreateLockerRequest {
  number: number;
  location: string;
}

export interface UpdateLockerRequest {
  number?: number;
  location?: string;
  status?: 'Maintenance';
  memberId?: string | null;
}

export type LockerResponse = LockerDTO;
