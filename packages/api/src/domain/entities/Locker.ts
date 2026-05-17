import { randomUUID } from 'node:crypto';
import type { LockerStatus } from '@alentapp/shared';

type LockerProps = {
    id?: string;
    number: number;
    location: string;
    status?: LockerStatus;
    memberId?: string | null;
};

export class Locker {
    readonly id: string;
    readonly number: number;
    readonly location: string;
    readonly status: LockerStatus;
    readonly memberId: string | null;

    constructor(props: LockerProps) {
        this.id = props.id ?? randomUUID();
        this.number = props.number;
        this.location = props.location;
        this.status = props.status ?? 'Available';
        this.memberId = props.memberId ?? null;
    }
}
