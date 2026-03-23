-- CreateEnum
CREATE TYPE "public"."MembershipRole" AS ENUM ('OWNER', 'ADMIN', 'MEMBER');

-- CreateTable
CREATE TABLE "public"."Membership" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "public"."MembershipRole" NOT NULL DEFAULT 'MEMBER',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "invitedById" TEXT,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastAccessedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Membership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CompanyInvitation" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "public"."MembershipRole" NOT NULL DEFAULT 'MEMBER',
    "tokenHash" TEXT NOT NULL,
    "invitedById" TEXT NOT NULL,
    "acceptedByUserId" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompanyInvitation_pkey" PRIMARY KEY ("id")
);

-- Backfill existing users into tenant memberships before removing the legacy direct company link
INSERT INTO "public"."Membership" (
    "id",
    "companyId",
    "userId",
    "role",
    "active",
    "joinedAt",
    "createdAt",
    "updatedAt"
)
SELECT
    CONCAT('mbr_', md5("id" || ':' || "companyId")),
    "companyId",
    "id",
    CASE
        WHEN "role" = 'ADMIN' THEN 'OWNER'::"public"."MembershipRole"
        ELSE 'MEMBER'::"public"."MembershipRole"
    END,
    "active",
    "createdAt",
    "createdAt",
    "updatedAt"
FROM "public"."User";

-- CreateIndex
CREATE UNIQUE INDEX "Membership_companyId_userId_key" ON "public"."Membership"("companyId", "userId");

-- CreateIndex
CREATE INDEX "Membership_userId_active_idx" ON "public"."Membership"("userId", "active");

-- CreateIndex
CREATE INDEX "Membership_companyId_role_active_idx" ON "public"."Membership"("companyId", "role", "active");

-- CreateIndex
CREATE UNIQUE INDEX "CompanyInvitation_tokenHash_key" ON "public"."CompanyInvitation"("tokenHash");

-- CreateIndex
CREATE INDEX "CompanyInvitation_companyId_email_expiresAt_idx" ON "public"."CompanyInvitation"("companyId", "email", "expiresAt");

-- CreateIndex
CREATE INDEX "CompanyInvitation_companyId_revokedAt_acceptedAt_idx" ON "public"."CompanyInvitation"("companyId", "revokedAt", "acceptedAt");

-- AddForeignKey
ALTER TABLE "public"."Membership" ADD CONSTRAINT "Membership_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "public"."Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Membership" ADD CONSTRAINT "Membership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Membership" ADD CONSTRAINT "Membership_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CompanyInvitation" ADD CONSTRAINT "CompanyInvitation_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "public"."Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CompanyInvitation" ADD CONSTRAINT "CompanyInvitation_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CompanyInvitation" ADD CONSTRAINT "CompanyInvitation_acceptedByUserId_fkey" FOREIGN KEY ("acceptedByUserId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Remove legacy direct user/company coupling after the backfill is in place
DROP INDEX "public"."User_companyId_role_idx";

ALTER TABLE "public"."User" DROP CONSTRAINT "User_companyId_fkey";

ALTER TABLE "public"."User" DROP COLUMN "companyId",
DROP COLUMN "role";
