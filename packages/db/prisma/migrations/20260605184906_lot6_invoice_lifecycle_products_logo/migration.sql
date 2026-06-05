-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('VIREMENT', 'CHEQUE', 'CARTE', 'COMPTANT', 'AUTRE');

-- AlterTable
ALTER TABLE "invoices" ADD COLUMN     "paidAt" TIMESTAMP(3),
ADD COLUMN     "paymentMethod" "PaymentMethod",
ADD COLUMN     "reference" TEXT,
ADD COLUMN     "sequenceNo" INTEGER,
ADD COLUMN     "sequenceYear" INTEGER;

-- AlterTable
ALTER TABLE "issuer_profile" ADD COLUMN     "logoPath" TEXT;

-- CreateTable
CREATE TABLE "invoice_sequences" (
    "year" INTEGER NOT NULL,
    "lastNumber" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "invoice_sequences_pkey" PRIMARY KEY ("year")
);

-- CreateTable
CREATE TABLE "products" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "unitPriceCents" INTEGER NOT NULL,
    "unit" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "products_archivedAt_idx" ON "products"("archivedAt");

-- CreateIndex
CREATE INDEX "products_name_idx" ON "products"("name");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_reference_key" ON "invoices"("reference");

