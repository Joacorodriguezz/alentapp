-- CreateEnum
CREATE TYPE "EquipmentLoanStatus" AS ENUM ('Loaned', 'Returned', 'Damaged');

-- CreateTable
CREATE TABLE "equipment_loans" (
    "id" TEXT NOT NULL,
    "itemName" TEXT NOT NULL,
    "status" "EquipmentLoanStatus" NOT NULL DEFAULT 'Loaned',
    "loanDate" TIMESTAMP(3) NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "memberId" TEXT NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "equipment_loans_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "equipment_loans" ADD CONSTRAINT "equipment_loans_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
