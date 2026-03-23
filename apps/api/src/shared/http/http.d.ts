import type { MembershipRole } from "@prisma/client";

declare global {
  namespace Express {
    interface Request {
      auth?: {
        userId: string;
        membershipId: string;
        companyId: string;
        role: MembershipRole;
        company: {
          id: string;
          name: string;
          slug: string;
          timezone: string;
        };
      };
    }
  }
}

export {};
