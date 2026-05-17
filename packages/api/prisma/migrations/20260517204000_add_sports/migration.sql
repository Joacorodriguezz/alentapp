CREATE TABLE "sports" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "maxCapacity" INTEGER NOT NULL,
    "additionalPrice" DOUBLE PRECISION,
    "requiresMedicalCertificate" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "sports_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "sports_name_key" ON "sports"("name");
