import type { MembershipRole, PlatformRole } from "@prisma/client";

declare global {
  namespace Express {
    interface Request {
      auth?: {
        userId: string;
        membershipId: string;
        companyId: string;
        role: MembershipRole;
        platformRole: PlatformRole;
        company: {
          id: string;
          name: string;
          slug: string;
          timezone: string;
          plan: "FREE" | "BASIC" | "PREMIUM" | "UNLIMITED";
          planExpiresAt: Date | null;
        };
      };
    }
  }
}

export {};
