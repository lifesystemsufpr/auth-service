-- CreateEnum
CREATE TYPE "SystemRole" AS ENUM ('MANAGER', 'PARTICIPANT', 'RESEARCHER', 'HEALTH_PROFESSIONAL');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE', 'OTHER');

-- CreateEnum
CREATE TYPE "Scholarship" AS ENUM ('NONE', 'FUNDAMENTAL_INCOMPLETE', 'FUNDAMENTAL_COMPLETE', 'HIGH_SCHOOL_INCOMPLETE', 'HIGH_SCHOOL_COMPLETE', 'HIGHER_EDUCATION_INCOMPLETE', 'HIGHER_EDUCATION_COMPLETE', 'POSTGRADUATE', 'MASTERS', 'DOCTORATE');

-- CreateEnum
CREATE TYPE "SocialEconomicLevel" AS ENUM ('A', 'B', 'C', 'D', 'E');

-- CreateTable
CREATE TABLE "user" (
    "id" TEXT NOT NULL,
    "cpf" TEXT,
    "email" TEXT,
    "fullName" TEXT NOT NULL,
    "fullName_normalized" TEXT NOT NULL DEFAULT '',
    "password" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "gender" "Gender",
    "role" "SystemRole" NOT NULL,
    "phone" TEXT,
    "passwordResetToken" TEXT,
    "passwordResetExpiresAt" TIMESTAMP(3),
    "passwordResetUsedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "researcher" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "fieldOfStudy" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "researcher_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "health_professional" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "speciality" TEXT NOT NULL,
    "speciality_normalized" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "health_professional_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "institution" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "title_normalized" TEXT NOT NULL DEFAULT '',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "institution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "participant" (
    "id" TEXT NOT NULL,
    "birthday" DATE NOT NULL,
    "weight" INTEGER NOT NULL DEFAULT 0,
    "height" INTEGER NOT NULL DEFAULT 0,
    "zipCode" TEXT NOT NULL,
    "street" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "complement" TEXT,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "neighborhood" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "socio_economic_level" "SocialEconomicLevel" NOT NULL,
    "scholarship" "Scholarship" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "participant_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_cpf_key" ON "user"("cpf");

-- CreateIndex
CREATE UNIQUE INDEX "user_email_key" ON "user"("email");

-- CreateIndex
CREATE UNIQUE INDEX "user_passwordResetToken_key" ON "user"("passwordResetToken");

-- CreateIndex
CREATE INDEX "user_fullName_normalized_idx" ON "user"("fullName_normalized");

-- CreateIndex
CREATE INDEX "user_passwordResetToken_idx" ON "user"("passwordResetToken");

-- CreateIndex
CREATE UNIQUE INDEX "researcher_id_key" ON "researcher"("id");

-- CreateIndex
CREATE UNIQUE INDEX "researcher_email_key" ON "researcher"("email");

-- CreateIndex
CREATE INDEX "researcher_institutionId_idx" ON "researcher"("institutionId");

-- CreateIndex
CREATE UNIQUE INDEX "health_professional_id_key" ON "health_professional"("id");

-- CreateIndex
CREATE UNIQUE INDEX "health_professional_email_key" ON "health_professional"("email");

-- CreateIndex
CREATE INDEX "health_professional_speciality_normalized_idx" ON "health_professional"("speciality_normalized");

-- CreateIndex
CREATE INDEX "health_professional_active_idx" ON "health_professional"("active");

-- CreateIndex
CREATE INDEX "institution_title_normalized_idx" ON "institution"("title_normalized");

-- CreateIndex
CREATE INDEX "institution_active_idx" ON "institution"("active");

-- CreateIndex
CREATE UNIQUE INDEX "participant_id_key" ON "participant"("id");

-- AddForeignKey
ALTER TABLE "researcher" ADD CONSTRAINT "researcher_id_fkey" FOREIGN KEY ("id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "researcher" ADD CONSTRAINT "researcher_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institution"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "health_professional" ADD CONSTRAINT "health_professional_id_fkey" FOREIGN KEY ("id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "participant" ADD CONSTRAINT "participant_id_fkey" FOREIGN KEY ("id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
