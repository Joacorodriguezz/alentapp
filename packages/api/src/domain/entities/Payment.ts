import { PaymentStatus } from '@alentapp/shared';

export class Payment {
    constructor(
        readonly id: string,
        readonly amount: number,
        readonly description: string | null,
        readonly status: PaymentStatus,
        readonly paymentDate: string,
        readonly memberId: string,
        readonly deletedAt: string | null,
        readonly createdAt: string,
        readonly updatedAt: string,
    ) {}
}
