export class Member {
    id;
    dni;
    name;
    email;
    birthdate;
    category;
    status;
    created_at;
    constructor(id, dni, name, email, birthdate, category, status, created_at) {
        this.id = id;
        this.dni = dni;
        this.name = name;
        this.email = email;
        this.birthdate = birthdate;
        this.category = category;
        this.status = status;
        this.created_at = created_at;
    }
    static isValidEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }
    static isMinor(birthdate) {
        const date = new Date(birthdate);
        const ageDifMs = Date.now() - date.getTime();
        const ageDate = new Date(ageDifMs);
        return Math.abs(ageDate.getUTCFullYear() - 1970) < 18;
    }
    static resolveCategory(birthdate, requested) {
        return Member.isMinor(birthdate) ? 'Cadete' : requested;
    }
}
