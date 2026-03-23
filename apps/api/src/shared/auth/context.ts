import type { MembershipRole } from "@prisma/client";

export type AuthContext = {
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

export function isWorkspaceAdmin(role: MembershipRole) {
  return role === "OWNER" || role === "ADMIN";
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
