-- CreateEnum
CREATE TYPE "GovernmentLevel" AS ENUM ('CENTRAL', 'STATE');

-- CreateEnum
CREATE TYPE "SchemeApplicationStatus" AS ENUM ('OPEN', 'UPCOMING', 'CLOSED', 'STATUS_UNVERIFIED');

-- CreateTable
CREATE TABLE "GovernmentScheme" (
    "id" TEXT NOT NULL,
    "schemeCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameHi" TEXT,
    "shortName" TEXT,
    "description" TEXT NOT NULL,
    "descriptionHi" TEXT,
    "ministry" TEXT NOT NULL,
    "department" TEXT,
    "governmentLevel" "GovernmentLevel" NOT NULL DEFAULT 'CENTRAL',
    "state" TEXT NOT NULL DEFAULT 'ALL',
    "categories" TEXT[],
    "beneficiaryTypes" TEXT[],
    "eligibilityCriteria" TEXT[],
    "eligibilityCriteriaHi" TEXT[],
    "fundingType" TEXT NOT NULL,
    "benefitSummary" TEXT NOT NULL,
    "benefitSummaryHi" TEXT,
    "maxSubsidyPercent" DOUBLE PRECISION,
    "maxBenefitAmount" TEXT,
    "applicationStatus" "SchemeApplicationStatus" NOT NULL DEFAULT 'OPEN',
    "applicationStartDate" TIMESTAMP(3),
    "applicationEndDate" TIMESTAMP(3),
    "isRollingApplication" BOOLEAN NOT NULL DEFAULT true,
    "requiredDocuments" TEXT[],
    "requiredDocumentsHi" TEXT[],
    "applicationSteps" TEXT[],
    "applicationStepsHi" TEXT[],
    "officialPortalUrl" TEXT NOT NULL,
    "guidelinesUrl" TEXT,
    "sourceUrl" TEXT NOT NULL,
    "verificationStatus" TEXT NOT NULL DEFAULT 'OFFICIAL_VERIFIED',
    "launchYear" INTEGER,
    "supportsOrganic" BOOLEAN NOT NULL DEFAULT false,
    "landholdingRequirement" TEXT,
    "tags" TEXT[],
    "lastUpdatedDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastVerifiedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSyncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GovernmentScheme_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SavedScheme" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "schemeId" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SavedScheme_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BatchSchemeLink" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "schemeId" TEXT NOT NULL,
    "linkedByUserId" TEXT NOT NULL,
    "utilizationNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BatchSchemeLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserPreference" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "preferredLanguage" TEXT NOT NULL DEFAULT 'en',
    "voiceLanguage" TEXT NOT NULL DEFAULT 'en-IN',
    "ttsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "state" TEXT,
    "district" TEXT,
    "farmerCategory" TEXT,
    "landholdingCategory" TEXT,
    "organicCertStatus" TEXT,
    "isFpoMember" BOOLEAN NOT NULL DEFAULT false,
    "farmingInterests" TEXT[],
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserPreference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SchemeSyncLog" (
    "id" TEXT NOT NULL,
    "sourceName" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "schemesChecked" INTEGER NOT NULL DEFAULT 0,
    "schemesUpdated" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SchemeSyncLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GovernmentScheme_schemeCode_key" ON "GovernmentScheme"("schemeCode");

-- CreateIndex
CREATE UNIQUE INDEX "SavedScheme_userId_schemeId_key" ON "SavedScheme"("userId", "schemeId");

-- CreateIndex
CREATE UNIQUE INDEX "BatchSchemeLink_batchId_schemeId_key" ON "BatchSchemeLink"("batchId", "schemeId");

-- CreateIndex
CREATE UNIQUE INDEX "UserPreference_userId_key" ON "UserPreference"("userId");

-- AddForeignKey
ALTER TABLE "SavedScheme" ADD CONSTRAINT "SavedScheme_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedScheme" ADD CONSTRAINT "SavedScheme_schemeId_fkey" FOREIGN KEY ("schemeId") REFERENCES "GovernmentScheme"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BatchSchemeLink" ADD CONSTRAINT "BatchSchemeLink_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "Batch"("batchId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BatchSchemeLink" ADD CONSTRAINT "BatchSchemeLink_schemeId_fkey" FOREIGN KEY ("schemeId") REFERENCES "GovernmentScheme"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BatchSchemeLink" ADD CONSTRAINT "BatchSchemeLink_linkedByUserId_fkey" FOREIGN KEY ("linkedByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPreference" ADD CONSTRAINT "UserPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

