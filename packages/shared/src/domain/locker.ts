export type LockerStatus = 'Available' | 'Occupied' | 'Maintenance';

export interface LockerDTO {
  id: string;
  number: number;
  location: string;
  status: LockerStatus;
  memberId: string | null;
}
