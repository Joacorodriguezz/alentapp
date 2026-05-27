export class Discipline {
    constructor(
        public id: string,
        public reason: string,
        public startDate: string,
        public endDate: string,
        public isTotalSuspension: boolean,
        public memberId: string,
        public deletedAt: string | null,
        public createdAt: string,
        public updatedAt: string,
    ) {}
}