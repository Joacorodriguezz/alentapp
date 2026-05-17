import { MemberCategory, MemberStatus } from '@alentapp/shared';

export class Member {
    constructor(
        readonly id: string,
        readonly dni: string,
        readonly name: string,
        readonly email: string,
        readonly birthdate: string,
        readonly category: MemberCategory,
        readonly status: MemberStatus,
        readonly created_at: string,
    ) {}

    static isValidEmail(email: string): boolean {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }

    static isMinor(birthdate: string): boolean {
        const date = new Date(birthdate);
        const ageDifMs = Date.now() - date.getTime();
        const ageDate = new Date(ageDifMs);
        return Math.abs(ageDate.getUTCFullYear() - 1970) < 18;
    }

    static resolveCategory(birthdate: string, requested: MemberCategory): MemberCategory {
        return Member.isMinor(birthdate) ? 'Cadete' : requested;
    }
}
