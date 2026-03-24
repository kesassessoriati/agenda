-- Add UNLIMITED variant to CompanyPlan enum
ALTER TYPE "public"."CompanyPlan" ADD VALUE 'UNLIMITED';

-- Add planExpiresAt column to Company (nullable — null means no expiry set or unlimited)
ALTER TABLE "public"."Company"
ADD COLUMN "planExpiresAt" TIMESTAMP(3);
