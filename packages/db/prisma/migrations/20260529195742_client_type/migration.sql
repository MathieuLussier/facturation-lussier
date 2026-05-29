-- CreateEnum
CREATE TYPE "ClientType" AS ENUM ('COMPANY', 'INDIVIDUAL');

-- AlterTable
ALTER TABLE "clients" ADD COLUMN     "type" "ClientType" NOT NULL DEFAULT 'COMPANY';
