import { MemberDTO, UpdateMemberRequest } from '@alentapp/shared';
import { Member } from '../../domain/entities/Member.js';

export interface IMemberRepository {
    create(member: Omit<MemberDTO, 'id'>): Promise<Member>;
    findById(id: string): Promise<Member | null>;
    findByDni(dni: string): Promise<Member | null>;
    findAll(): Promise<Member[]>;
    update(id: string, data: UpdateMemberRequest): Promise<Member>;
    delete(id: string): Promise<void>;
}

export type MemberRepository = IMemberRepository;
