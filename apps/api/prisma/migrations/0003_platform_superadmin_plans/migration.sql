-- CreateEnum
CREATE TYPE "public"."PlatformRole" AS ENUM ('USER', 'SUPERADMIN');

-- CreateEnum
CREATE TYPE "public"."CompanyPlan" AS ENUM ('FREE', 'BASIC', 'PREMIUM');

-- AlterTable
ALTER TABLE "public"."User"
ADD COLUMN "platformRole" "public"."PlatformRole" NOT NULL DEFAULT 'USER';

-- AlterTable
ALTER TABLE "public"."Company"
ADD COLUMN "plan" "public"."CompanyPlan" NOT NULL DEFAULT 'FREE';

-- Promote the existing seeded default account to platform superadmin
UPDATE "public"."User"
SET "platformRole" = 'SUPERADMIN'
WHERE lower("email") = 'admin@kes.local';
