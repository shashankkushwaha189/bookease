-- CreateTable
CREATE TABLE "TenantConfig" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "config" JSONB NOT NULL,
    "createdBy" TEXT NOT NULL,
    "note" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TenantConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TenantConfig_tenantId_version_idx" ON "TenantConfig"("tenantId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "TenantConfig_tenantId_version_key" ON "TenantConfig"("tenantId", "version");
