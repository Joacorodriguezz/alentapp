-- CreateTable
CREATE TABLE "medical_certificates" (
    "id" TEXT NOT NULL,
    "issueDate" TIMESTAMP(3) NOT NULL,
    "expiryDate" TIMESTAMP(3) NOT NULL,
    "doctorLicence" TEXT NOT NULL,
    "institution" TEXT NOT NULL,
    "isValidated" BOOLEAN NOT NULL DEFAULT true,
    "memberId" TEXT NOT NULL,

    CONSTRAINT "medical_certificates_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "medical_certificates" ADD CONSTRAINT "medical_certificates_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
