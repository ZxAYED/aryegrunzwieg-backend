/*
  Warnings:

  - You are about to drop the column `assignedJobs` on the `Service` table. All the data in the column will be lost.
  - You are about to drop the column `completedJobs` on the `Service` table. All the data in the column will be lost.
  - You are about to drop the column `ratingAvg` on the `Service` table. All the data in the column will be lost.
  - You are about to drop the column `ratingCount` on the `Service` table. All the data in the column will be lost.
  - You are about to drop the column `totalRatings` on the `Service` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Service" DROP COLUMN "assignedJobs",
DROP COLUMN "completedJobs",
DROP COLUMN "ratingAvg",
DROP COLUMN "ratingCount",
DROP COLUMN "totalRatings",
ADD COLUMN     "specializationId" TEXT;

-- CreateTable
CREATE TABLE "ServiceSpecialization" (
    "serviceId" TEXT NOT NULL,
    "specializationId" TEXT NOT NULL,

    CONSTRAINT "ServiceSpecialization_pkey" PRIMARY KEY ("serviceId","specializationId")
);

-- CreateIndex
CREATE INDEX "ServiceSpecialization_specializationId_idx" ON "ServiceSpecialization"("specializationId");

-- CreateIndex
CREATE INDEX "Service_specializationId_idx" ON "Service"("specializationId");

-- AddForeignKey
ALTER TABLE "Service" ADD CONSTRAINT "Service_specializationId_fkey" FOREIGN KEY ("specializationId") REFERENCES "Specialization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceSpecialization" ADD CONSTRAINT "ServiceSpecialization_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceSpecialization" ADD CONSTRAINT "ServiceSpecialization_specializationId_fkey" FOREIGN KEY ("specializationId") REFERENCES "Specialization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
