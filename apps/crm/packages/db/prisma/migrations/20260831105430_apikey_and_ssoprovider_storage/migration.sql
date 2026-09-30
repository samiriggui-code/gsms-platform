-- CreateTable
CREATE TABLE "apikey" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "prefix" TEXT,
    "start" TEXT,
    "keyHash" TEXT NOT NULL,
    "referenceId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastRequest" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "apikey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ssoProvider" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "issuer" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "oidcConfig" TEXT,
    "samlConfig" TEXT,
    "organizationId" TEXT,

    CONSTRAINT "ssoProvider_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "apikey_keyHash_key" ON "apikey"("keyHash");

-- CreateIndex
CREATE INDEX "apikey_referenceId_idx" ON "apikey"("referenceId");

-- CreateIndex
CREATE UNIQUE INDEX "ssoProvider_providerId_key" ON "ssoProvider"("providerId");

-- AddForeignKey
ALTER TABLE "apikey" ADD CONSTRAINT "apikey_referenceId_fkey" FOREIGN KEY ("referenceId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
