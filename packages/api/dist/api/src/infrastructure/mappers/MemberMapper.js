import { Member } from '../../domain/entities/Member.js';
export class MemberMapper {
    static fromDB(record) {
        return new Member(record.id, record.dni, record.name, record.email, record.birthdate ? record.birthdate.toISOString().split('T')[0] : '', record.category, record.status, record.created_at.toISOString());
    }
    static toDTO(member) {
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
