-- CreateTable
CREATE TABLE "issuer_profile" (
    "id" TEXT NOT NULL,
    "legalName" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "addressLine" TEXT,
    "city" TEXT,
    "province" TEXT DEFAULT 'QC',
    "postalCode" TEXT,
    "country" TEXT DEFAULT 'Canada',
    "gstNumber" TEXT,
    "qstNumber" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "issuer_profile_pkey" PRIMARY KEY ("id")
);
