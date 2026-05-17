import type { LockerDTO } from '../domain/locker.js';

export interface CreateLockerRequest {
  number: number;
  location: string;
}

export type LockerResponse = LockerDTO;
