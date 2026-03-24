import type { MembershipRole, PlatformRole } from "@prisma/client";

export type AuthContext = {
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

export function isWorkspaceAdmin(role: MembershipRole) {
  return role === "OWNER" || role === "ADMIN";
}

export function isSuperAdmin(platformRole: PlatformRole) {
  return platformRole === "SUPERADMIN";
}

export function canAssignMembershipRole(actorRole: MembershipRole, nextRole: MembershipRole) {
  if (actorRole === "OWNER") {
    return true;
  }

  if (actorRole === "ADMIN") {
    return nextRole === "ADMIN" || nextRole === "MEMBER";
  }

  return false;
}

export function canManageMembership(actorRole: MembershipRole, targetRole: MembershipRole) {
  if (actorRole === "OWNER") {
    return true;
  }

  if (actorRole === "ADMIN") {
    return targetRole !== "OWNER";
  }

  return false;
}
