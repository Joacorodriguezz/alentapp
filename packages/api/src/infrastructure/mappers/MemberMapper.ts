import { MemberDTO } from '@alentapp/shared';
import { Member } from '../../domain/entities/Member.js';

export type DBMember = {
    id: string;
    dni: string;
    name: string;
    email: string;
    birthdate: Date | null;
    category: 'Pleno' | 'Cadete' | 'Honorario';
    status: 'Activo' | 'Moroso' | 'Suspendido';
    created_at: Date;
};

export class MemberMapper {
    static fromDB(record: DBMember): Member {
        return new Member(
            record.id,
            record.dni,
            record.name,
            record.email,
            record.birthdate ? record.birthdate.toISOString().split('T')[0] : '',
            record.category,
            record.status,
            record.created_at.toISOString(),
        );
    }

    static toDTO(member: Member): MemberDTO {
        return {
            id: member.id,
            dni: member.dni,
            name: member.name,
            email: member.email,
            birthdate: member.birthdate,
            category: member.category,
            status: member.status,
            created_at: member.created_at,
        };
    }
}
