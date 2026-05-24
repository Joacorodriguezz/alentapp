import type { LockerDTO, LockerStatus } from '../domain/locker.js';

export interface CreateLockerRequest {
  number: number;
  location: string;
}

export interface UpdateLockerRequest {
  number?: number;
  location?: string;
  status?: LockerStatus;
  memberId?: string | null;
}

export type LockerResponse = LockerDTO;
