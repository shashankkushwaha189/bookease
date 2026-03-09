/*
  Warnings:

  - You are about to drop the column `seriesIndex` on the `Appointment` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `AppointmentArchive` table. All the data in the column will be lost.
  - You are about to drop the column `createdBy` on the `AppointmentArchive` table. All the data in the column will be lost.
  - You are about to drop the column `seriesId` on the `AppointmentArchive` table. All the data in the column will be lost.
  - You are about to drop the column `seriesIndex` on the `AppointmentArchive` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `AppointmentArchive` table. All the data in the column will be lost.
  - You are about to drop the column `consentText` on the `ConsentRecord` table. All the data in the column will be lost.
  - You are about to drop the column `customerEmail` on the `ConsentRecord` table. All the data in the column will be lost.
  - You are about to drop the column `tenantId` on the `ConsentRecord` table. All the data in the column will be lost.
  - You are about to drop the `RecurringAppointmentSeries` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[referenceId]` on the table `Appointment` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[originalId]` on the table `AppointmentArchive` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[email]` on the table `Staff` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[userId,tenantId]` on the table `Staff` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[domain]` on the table `Tenant` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `customerEmail` to the `AppointmentArchive` table without a default value. This is not possible if the table is not empty.
  - Added the required column `customerName` to the `AppointmentArchive` table without a default value. This is not possible if the table is not empty.
  - Added the required column `originalId` to the `AppointmentArchive` table without a default value. This is not possible if the table is not empty.
  - Added the required column `serviceName` to the `AppointmentArchive` table without a default value. This is not possible if the table is not empty.
  - Added the required column `staffName` to the `AppointmentArchive` table without a default value. This is not possible if the table is not empty.
  - Added the required column `customerId` to the `ConsentRecord` table without a default value. This is not possible if the table is not empty.
  - Added the required column `given` to the `ConsentRecord` table without a default value. This is not possible if the table is not empty.
  - Added the required column `type` to the `ConsentRecord` table without a default value. This is not possible if the table is not empty.
  - Added the required column `version` to the `ConsentRecord` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "TimeOffType" AS ENUM ('VACATION', 'SICK', 'PERSONAL', 'HOLIDAY', 'TRAINING');

-- AlterEnum
ALTER TYPE "UserRole" ADD VALUE 'USER';

-- DropForeignKey
ALTER TABLE "Appointment" DROP CONSTRAINT "Appointment_seriesId_fkey";

-- DropForeignKey
ALTER TABLE "AppointmentArchive" DROP CONSTRAINT "AppointmentArchive_seriesId_fkey";

-- DropForeignKey
ALTER TABLE "RecurringAppointmentSeries" DROP CONSTRAINT "RecurringAppointmentSeries_tenantId_fkey";

-- DropIndex
DROP INDEX "AppointmentArchive_referenceId_idx";

-- DropIndex
DROP INDEX "AppointmentArchive_status_createdAt_idx";

-- DropIndex
DROP INDEX "AppointmentArchive_tenantId_staffId_startTimeUtc_idx";

-- DropIndex
DROP INDEX "AppointmentArchive_tenantId_startTimeUtc_idx";

-- DropIndex
DROP INDEX "AppointmentArchive_tenantId_status_idx";

-- DropIndex
DROP INDEX "ConsentRecord_tenantId_customerEmail_idx";

-- DropIndex
DROP INDEX "Customer_tenantId_email_key";

-- DropIndex
DROP INDEX "Staff_tenantId_idx";

-- AlterTable
ALTER TABLE "Appointment" DROP COLUMN "seriesIndex",
ADD COLUMN     "cancelledAt" TIMESTAMP(3),
ADD COLUMN     "completedAt" TIMESTAMP(3),
ADD COLUMN     "confirmedAt" TIMESTAMP(3),
ADD COLUMN     "requiresConfirmation" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "AppointmentArchive" DROP COLUMN "createdAt",
DROP COLUMN "createdBy",
DROP COLUMN "seriesId",
DROP COLUMN "seriesIndex",
DROP COLUMN "updatedAt",
ADD COLUMN     "archivedBy" TEXT,
ADD COLUMN     "customerEmail" TEXT NOT NULL,
ADD COLUMN     "customerName" TEXT NOT NULL,
ADD COLUMN     "originalId" TEXT NOT NULL,
ADD COLUMN     "serviceName" TEXT NOT NULL,
ADD COLUMN     "staffName" TEXT NOT NULL,
ADD COLUMN     "totalAmount" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "ConsentRecord" DROP COLUMN "consentText",
DROP COLUMN "customerEmail",
DROP COLUMN "tenantId",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "customerId" TEXT NOT NULL,
ADD COLUMN     "documentUrl" TEXT,
ADD COLUMN     "expiresAt" TIMESTAMP(3),
ADD COLUMN     "given" BOOLEAN NOT NULL,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "type" TEXT NOT NULL,
ADD COLUMN     "userAgent" TEXT,
ADD COLUMN     "version" TEXT NOT NULL,
ADD COLUMN     "withdrawnAt" TIMESTAMP(3),
ADD COLUMN     "withdrawnBy" TEXT,
ALTER COLUMN "ipAddress" DROP NOT NULL,
ALTER COLUMN "givenAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Customer" ADD COLUMN     "address" JSONB,
ADD COLUMN     "averageRating" DOUBLE PRECISION,
ADD COLUMN     "consentDate" TIMESTAMP(3),
ADD COLUMN     "dateOfBirth" TIMESTAMP(3),
ADD COLUMN     "emergencyContact" JSONB,
ADD COLUMN     "gender" TEXT,
ADD COLUMN     "lastVisitDate" TIMESTAMP(3),
ADD COLUMN     "medicalInfo" JSONB,
ADD COLUMN     "preferences" JSONB,
ADD COLUMN     "source" TEXT,
ADD COLUMN     "sourceDetails" TEXT,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN     "totalSpent" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "totalVisits" INTEGER NOT NULL DEFAULT 0,
ALTER COLUMN "tags" SET DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "Service" ADD COLUMN     "allowOnlineBooking" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "category" TEXT NOT NULL DEFAULT 'General',
ADD COLUMN     "color" TEXT,
ADD COLUMN     "depositAmount" DECIMAL(65,30),
ADD COLUMN     "maxAdvanceBookingDays" INTEGER,
ADD COLUMN     "minAdvanceBookingHours" INTEGER,
ADD COLUMN     "requiresConfirmation" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "requiresDeposit" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "tags" TEXT[];

-- AlterTable
ALTER TABLE "SlotLock" ADD COLUMN     "appointmentId" TEXT,
ADD COLUMN     "customerId" TEXT,
ADD COLUMN     "lockType" TEXT NOT NULL DEFAULT 'BOOKING',
ADD COLUMN     "serviceId" TEXT;

-- AlterTable
ALTER TABLE "Staff" ADD COLUMN     "commissionRate" DOUBLE PRECISION,
ADD COLUMN     "department" TEXT,
ADD COLUMN     "hireDate" TIMESTAMP(3),
ADD COLUMN     "lastLoginAt" TIMESTAMP(3),
ADD COLUMN     "maxConcurrentAppointments" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "requiresApproval" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "title" TEXT;

-- AlterTable
ALTER TABLE "StaffBreak" ADD COLUMN     "title" TEXT;

-- AlterTable
ALTER TABLE "StaffTimeOff" ADD COLUMN     "isPaid" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "type" "TimeOffType" NOT NULL DEFAULT 'PERSONAL';

-- AlterTable
ALTER TABLE "Tenant" ADD COLUMN     "domain" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "avatarUrl" TEXT,
ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "deviceId" TEXT,
ADD COLUMN     "emailCodeExpiresAt" TIMESTAMP(3),
ADD COLUMN     "emailVerificationCode" TEXT,
ADD COLUMN     "lastLoginAt" TIMESTAMP(3),
ADD COLUMN     "lastSeenAt" TIMESTAMP(3),
ADD COLUMN     "mfaEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "mfaSecret" TEXT,
ADD COLUMN     "phoneNumber" TEXT,
ADD COLUMN     "preferences" JSONB,
ADD COLUMN     "recoveryCodes" TEXT,
ADD COLUMN     "recoveryCodesGeneratedAt" TIMESTAMP(3),
ADD COLUMN     "smsCodeExpiresAt" TIMESTAMP(3),
ADD COLUMN     "smsVerificationCode" TEXT;

-- AlterTable
ALTER TABLE "WeeklySchedule" ADD COLUMN     "maxAppointments" INTEGER;

-- DropTable
DROP TABLE "RecurringAppointmentSeries";

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastAccessAt" TIMESTAMP(3),
    "deviceId" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DateOverride" (
    "id" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "isWorking" BOOLEAN NOT NULL DEFAULT true,
    "startTime" TEXT,
    "endTime" TEXT,
    "reason" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DateOverride_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookingAttempt" (
    "id" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "startTimeUtc" TIMESTAMP(3) NOT NULL,
    "endTimeUtc" TIMESTAMP(3) NOT NULL,
    "attemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "success" BOOLEAN NOT NULL,
    "failureReason" TEXT,
    "lockId" TEXT,

    CONSTRAINT "BookingAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerNote" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "isPrivate" BOOLEAN NOT NULL DEFAULT false,
    "isImportant" BOOLEAN NOT NULL DEFAULT false,
    "tags" TEXT[],
    "attachments" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomerNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerTag" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomerTag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecurringSeries" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "startTimeUtc" TIMESTAMP(3) NOT NULL,
    "endTimeUtc" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "recurrenceRule" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "totalOccurrences" INTEGER NOT NULL DEFAULT 0,
    "completedOccurrences" INTEGER NOT NULL DEFAULT 0,
    "cancelledOccurrences" INTEGER NOT NULL DEFAULT 0,
    "nextOccurrence" TIMESTAMP(3),
    "createdBy" TEXT NOT NULL,
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RecurringSeries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ArchivalConfig" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "archiveAfterMonths" INTEGER NOT NULL,
    "archiveStatuses" TEXT[],
    "excludeRecentDays" INTEGER NOT NULL,
    "batchSize" INTEGER NOT NULL,
    "scheduleCron" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ArchivalConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ArchivalJob" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "totalAppointments" INTEGER NOT NULL,
    "archivedAppointments" INTEGER NOT NULL,
    "failedAppointments" INTEGER NOT NULL,
    "errorMessage" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ArchivalJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImportJob" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "importType" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "totalRows" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "options" JSONB NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "processedRows" INTEGER NOT NULL DEFAULT 0,
    "successfulRows" INTEGER NOT NULL DEFAULT 0,
    "failedRows" INTEGER NOT NULL DEFAULT 0,
    "skippedRows" INTEGER NOT NULL DEFAULT 0,
    "duplicateRows" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ImportJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PolicyRule" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "priority" INTEGER NOT NULL DEFAULT 50,
    "config" JSONB NOT NULL,
    "conditions" JSONB,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,

    CONSTRAINT "PolicyRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PolicyOverride" (
    "id" TEXT NOT NULL,
    "policyEvaluationId" TEXT NOT NULL,
    "policyId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "reasonText" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "userRole" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PolicyOverride_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PolicyRuleArchive" (
    "id" TEXT NOT NULL,
    "policyId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL,
    "priority" INTEGER NOT NULL,
    "config" JSONB NOT NULL,
    "conditions" JSONB,
    "version" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "archivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "archivedBy" TEXT,

    CONSTRAINT "PolicyRuleArchive_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppointmentTimelineEvent" (
    "id" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    "userRole" TEXT NOT NULL,
    "data" JSONB,
    "correlationId" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "sessionId" TEXT,
    "previousState" JSONB,
    "newState" JSONB,
    "reason" TEXT,
    "isSystemGenerated" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AppointmentTimelineEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIUsageTracking" (
    "id" TEXT NOT NULL,
    "correlationId" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "response" TEXT NOT NULL,
    "tokensPrompt" INTEGER NOT NULL,
    "tokensCompletion" INTEGER NOT NULL,
    "tokensTotal" INTEGER NOT NULL,
    "processingTime" INTEGER NOT NULL,
    "confidence" DOUBLE PRECISION,
    "cost" DOUBLE PRECISION,
    "success" BOOLEAN NOT NULL DEFAULT true,
    "errorMessage" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AIUsageTracking_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Session_token_key" ON "Session"("token");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE INDEX "DateOverride_staffId_date_idx" ON "DateOverride"("staffId", "date");

-- CreateIndex
CREATE INDEX "DateOverride_date_idx" ON "DateOverride"("date");

-- CreateIndex
CREATE INDEX "BookingAttempt_staffId_attemptAt_idx" ON "BookingAttempt"("staffId", "attemptAt");

-- CreateIndex
CREATE INDEX "BookingAttempt_success_idx" ON "BookingAttempt"("success");

-- CreateIndex
CREATE INDEX "CustomerNote_customerId_createdAt_idx" ON "CustomerNote"("customerId", "createdAt");

-- CreateIndex
CREATE INDEX "CustomerNote_staffId_idx" ON "CustomerNote"("staffId");

-- CreateIndex
CREATE INDEX "CustomerNote_type_idx" ON "CustomerNote"("type");

-- CreateIndex
CREATE INDEX "CustomerNote_isImportant_idx" ON "CustomerNote"("isImportant");

-- CreateIndex
CREATE INDEX "CustomerTag_tenantId_isActive_idx" ON "CustomerTag"("tenantId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "CustomerTag_tenantId_name_key" ON "CustomerTag"("tenantId", "name");

-- CreateIndex
CREATE INDEX "RecurringSeries_tenantId_staffId_idx" ON "RecurringSeries"("tenantId", "staffId");

-- CreateIndex
CREATE INDEX "RecurringSeries_tenantId_status_idx" ON "RecurringSeries"("tenantId", "status");

-- CreateIndex
CREATE INDEX "RecurringSeries_nextOccurrence_idx" ON "RecurringSeries"("nextOccurrence");

-- CreateIndex
CREATE UNIQUE INDEX "ArchivalConfig_tenantId_key" ON "ArchivalConfig"("tenantId");

-- CreateIndex
CREATE INDEX "ArchivalJob_tenantId_status_idx" ON "ArchivalJob"("tenantId", "status");

-- CreateIndex
CREATE INDEX "ArchivalJob_createdAt_idx" ON "ArchivalJob"("createdAt");

-- CreateIndex
CREATE INDEX "ImportJob_tenantId_status_idx" ON "ImportJob"("tenantId", "status");

-- CreateIndex
CREATE INDEX "ImportJob_startedAt_idx" ON "ImportJob"("startedAt");

-- CreateIndex
CREATE INDEX "PolicyRule_tenantId_type_idx" ON "PolicyRule"("tenantId", "type");

-- CreateIndex
CREATE INDEX "PolicyRule_tenantId_isActive_idx" ON "PolicyRule"("tenantId", "isActive");

-- CreateIndex
CREATE INDEX "PolicyRule_priority_idx" ON "PolicyRule"("priority");

-- CreateIndex
CREATE UNIQUE INDEX "PolicyOverride_policyEvaluationId_key" ON "PolicyOverride"("policyEvaluationId");

-- CreateIndex
CREATE INDEX "PolicyOverride_policyEvaluationId_idx" ON "PolicyOverride"("policyEvaluationId");

-- CreateIndex
CREATE INDEX "PolicyOverride_policyId_idx" ON "PolicyOverride"("policyId");

-- CreateIndex
CREATE INDEX "PolicyOverride_userId_idx" ON "PolicyOverride"("userId");

-- CreateIndex
CREATE INDEX "PolicyRuleArchive_policyId_idx" ON "PolicyRuleArchive"("policyId");

-- CreateIndex
CREATE INDEX "PolicyRuleArchive_archivedAt_idx" ON "PolicyRuleArchive"("archivedAt");

-- CreateIndex
CREATE INDEX "AppointmentTimelineEvent_appointmentId_timestamp_idx" ON "AppointmentTimelineEvent"("appointmentId", "timestamp");

-- CreateIndex
CREATE INDEX "AppointmentTimelineEvent_eventType_idx" ON "AppointmentTimelineEvent"("eventType");

-- CreateIndex
CREATE INDEX "AppointmentTimelineEvent_userId_idx" ON "AppointmentTimelineEvent"("userId");

-- CreateIndex
CREATE INDEX "AppointmentTimelineEvent_correlationId_idx" ON "AppointmentTimelineEvent"("correlationId");

-- CreateIndex
CREATE INDEX "AppointmentTimelineEvent_timestamp_idx" ON "AppointmentTimelineEvent"("timestamp");

-- CreateIndex
CREATE INDEX "AIUsageTracking_correlationId_idx" ON "AIUsageTracking"("correlationId");

-- CreateIndex
CREATE INDEX "AIUsageTracking_model_idx" ON "AIUsageTracking"("model");

-- CreateIndex
CREATE INDEX "AIUsageTracking_createdAt_idx" ON "AIUsageTracking"("createdAt");

-- CreateIndex
CREATE INDEX "AIUsageTracking_success_idx" ON "AIUsageTracking"("success");

-- CreateIndex
CREATE UNIQUE INDEX "Appointment_referenceId_key" ON "Appointment"("referenceId");

-- CreateIndex
CREATE UNIQUE INDEX "AppointmentArchive_originalId_key" ON "AppointmentArchive"("originalId");

-- CreateIndex
CREATE INDEX "AppointmentArchive_tenantId_archivedAt_idx" ON "AppointmentArchive"("tenantId", "archivedAt");

-- CreateIndex
CREATE INDEX "AppointmentArchive_customerId_idx" ON "AppointmentArchive"("customerId");

-- CreateIndex
CREATE INDEX "AppointmentArchive_staffId_idx" ON "AppointmentArchive"("staffId");

-- CreateIndex
CREATE INDEX "AppointmentArchive_serviceId_idx" ON "AppointmentArchive"("serviceId");

-- CreateIndex
CREATE INDEX "AppointmentArchive_status_idx" ON "AppointmentArchive"("status");

-- CreateIndex
CREATE INDEX "AppointmentArchive_originalId_idx" ON "AppointmentArchive"("originalId");

-- CreateIndex
CREATE INDEX "ConsentRecord_customerId_type_idx" ON "ConsentRecord"("customerId", "type");

-- CreateIndex
CREATE INDEX "ConsentRecord_givenAt_idx" ON "ConsentRecord"("givenAt");

-- CreateIndex
CREATE INDEX "ConsentRecord_expiresAt_idx" ON "ConsentRecord"("expiresAt");

-- CreateIndex
CREATE INDEX "Customer_tenantId_email_idx" ON "Customer"("tenantId", "email");

-- CreateIndex
CREATE INDEX "Customer_status_idx" ON "Customer"("status");

-- CreateIndex
CREATE INDEX "Customer_deletedAt_idx" ON "Customer"("deletedAt");

-- CreateIndex
CREATE INDEX "Service_tenantId_isActive_idx" ON "Service"("tenantId", "isActive");

-- CreateIndex
CREATE INDEX "Service_tenantId_category_idx" ON "Service"("tenantId", "category");

-- CreateIndex
CREATE UNIQUE INDEX "Staff_email_key" ON "Staff"("email");

-- CreateIndex
CREATE INDEX "Staff_tenantId_email_idx" ON "Staff"("tenantId", "email");

-- CreateIndex
CREATE INDEX "Staff_tenantId_isActive_idx" ON "Staff"("tenantId", "isActive");

-- CreateIndex
CREATE INDEX "Staff_tenantId_deletedAt_idx" ON "Staff"("tenantId", "deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Staff_userId_tenantId_key" ON "Staff"("userId", "tenantId");

-- CreateIndex
CREATE INDEX "StaffTimeOff_staffId_type_idx" ON "StaffTimeOff"("staffId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_domain_key" ON "Tenant"("domain");

-- AddForeignKey
ALTER TABLE "DateOverride" ADD CONSTRAINT "DateOverride_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "Staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "RecurringSeries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingAttempt" ADD CONSTRAINT "BookingAttempt_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "Staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingAttempt" ADD CONSTRAINT "BookingAttempt_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingAttempt" ADD CONSTRAINT "BookingAttempt_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerNote" ADD CONSTRAINT "CustomerNote_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerNote" ADD CONSTRAINT "CustomerNote_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "Staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerTag" ADD CONSTRAINT "CustomerTag_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsentRecord" ADD CONSTRAINT "ConsentRecord_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SlotLock" ADD CONSTRAINT "SlotLock_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SlotLock" ADD CONSTRAINT "SlotLock_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SlotLock" ADD CONSTRAINT "SlotLock_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecurringSeries" ADD CONSTRAINT "RecurringSeries_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecurringSeries" ADD CONSTRAINT "RecurringSeries_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "Staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecurringSeries" ADD CONSTRAINT "RecurringSeries_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecurringSeries" ADD CONSTRAINT "RecurringSeries_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArchivalConfig" ADD CONSTRAINT "ArchivalConfig_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArchivalJob" ADD CONSTRAINT "archival_job_tenant_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArchivalJob" ADD CONSTRAINT "archival_job_config_fkey" FOREIGN KEY ("tenantId") REFERENCES "ArchivalConfig"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportJob" ADD CONSTRAINT "ImportJob_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PolicyRule" ADD CONSTRAINT "PolicyRule_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PolicyOverride" ADD CONSTRAINT "PolicyOverride_policyId_fkey" FOREIGN KEY ("policyId") REFERENCES "PolicyRule"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppointmentTimelineEvent" ADD CONSTRAINT "AppointmentTimelineEvent_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
