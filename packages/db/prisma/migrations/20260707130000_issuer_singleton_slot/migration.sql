-- AlterTable : verrou de singleton pour issuer_profile (au plus une ligne)
ALTER TABLE "issuer_profile" ADD COLUMN "slot" INTEGER NOT NULL DEFAULT 1;

-- CreateIndex
CREATE UNIQUE INDEX "issuer_profile_slot_key" ON "issuer_profile"("slot");
