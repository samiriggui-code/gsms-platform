/*
  Warnings:

  - You are about to drop the `apikey` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `invitation` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `rateLimit` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `session` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ssoProvider` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `verification` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "apikey" DROP CONSTRAINT "apikey_referenceId_fkey";

-- DropForeignKey
ALTER TABLE "invitation" DROP CONSTRAINT "invitation_inviterId_fkey";

-- DropForeignKey
ALTER TABLE "invitation" DROP CONSTRAINT "invitation_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "session" DROP CONSTRAINT "session_userId_fkey";

-- DropForeignKey
ALTER TABLE "ssoProvider" DROP CONSTRAINT "ssoProvider_userId_fkey";

-- AlterTable
ALTER TABLE "user" ADD COLUMN     "password" TEXT;

-- DropTable
DROP TABLE "apikey";

-- DropTable
DROP TABLE "invitation";

-- DropTable
DROP TABLE "rateLimit";

-- DropTable
DROP TABLE "session";

-- DropTable
DROP TABLE "ssoProvider";

-- DropTable
DROP TABLE "verification";
