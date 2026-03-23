import type { MembershipRole, Prisma } from "@prisma/client";
import jwt, { type SignOptions } from "jsonwebtoken";

import { env } from "../config/env.js";
import { AppError } from "../errors/app-error.js";
import { prisma } from "../lib/prisma.js";

const companySummarySelect = {
  id: true,
  name: true,
  slug: true,
  timezone: true,
} satisfies Prisma.CompanySelect;

const membershipSessionInclude = {
  company: {
    select: companySummarySelect,
  },
} satisfies Prisma.MembershipInclude;

type SessionMembership = Prisma.MembershipGetPayload<{
  include: typeof membershipSessionInclude;
}>;

type SessionUser = {
  id: string;
  name: string;
  email: string;
  color: string | null;
  timezone: string;
  membershipId: string;
  companyId: string;
  role: MembershipRole;
  company: SessionMembership["company"];
  memberships: Array<{
    id: string;
    companyId: string;
    role: MembershipRole;
    joinedAt: Date;
    lastAccessedAt: Date | null;
    company: SessionMembership["company"];
  }>;
};

function serializeMembership(membership: SessionMembership) {
  return {
    id: membership.id,
    companyId: membership.companyId,
    role: membership.role,
    joinedAt: membership.joinedAt,
    lastAccessedAt: membership.lastAccessedAt,
    company: membership.company,
  };
}

async function listActiveMemberships(userId: string) {
  return prisma.membership.findMany({
    where: {
      userId,
      active: true,
      user: {
        active: true,
      },
    },
    include: membershipSessionInclude,
    orderBy: [{ lastAccessedAt: "desc" }, { createdAt: "asc" }],
  });
}

export function signAuthToken(input: {
  userId: string;
  membershipId: string;
  companyId: string;
  role: MembershipRole;
}) {
  return jwt.sign(
    {
      membershipId: input.membershipId,
      companyId: input.companyId,
      role: input.role,
    },
    env.JWT_SECRET,
    {
      subject: input.userId,
      expiresIn: env.JWT_EXPIRES_IN as SignOptions["expiresIn"],
    },
  );
}

export async function getMembershipByIdForUser(userId: string, membershipId: string) {
  return prisma.membership.findFirst({
    where: {
      id: membershipId,
      userId,
      active: true,
      user: {
        active: true,
      },
    },
    include: membershipSessionInclude,
  });
}

export async function resolvePreferredMembership(userId: string, preferredCompanySlug?: string) {
  const memberships = await listActiveMemberships(userId);

  if (memberships.length === 0) {
    throw new AppError("Nenhum workspace ativo foi encontrado para este usuário.", 403);
  }

  if (!preferredCompanySlug) {
    return memberships[0]!;
  }

  const selectedMembership = memberships.find((membership) => membership.company.slug === preferredCompanySlug);
  if (!selectedMembership) {
    throw new AppError("Você não possui acesso ao workspace informado.", 403);
  }

  return selectedMembership;
}

export async function touchMembership(membershipId: string) {
  await prisma.membership.update({
    where: { id: membershipId },
    data: {
      lastAccessedAt: new Date(),
    },
  });
}

export async function getSessionUser(userId: string, membershipId: string): Promise<SessionUser> {
  const [user, memberships] = await Promise.all([
    prisma.user.findFirst({
      where: {
        id: userId,
        active: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        color: true,
        timezone: true,
      },
    }),
    listActiveMemberships(userId),
  ]);

  if (!user) {
    throw new AppError("Usuário não encontrado.", 404);
  }

  const activeMembership = memberships.find((membership) => membership.id === membershipId);
  if (!activeMembership) {
    throw new AppError("Workspace ativo inválido para este usuário.", 403);
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    color: user.color,
    timezone: user.timezone,
    membershipId: activeMembership.id,
    companyId: activeMembership.companyId,
    role: activeMembership.role,
    company: activeMembership.company,
    memberships: memberships.map(serializeMembership),
  };
}

export async function buildAuthSession(userId: string, membershipId: string) {
  await touchMembership(membershipId);
  const sessionUser = await getSessionUser(userId, membershipId);

  return {
    token: signAuthToken({
      userId,
      membershipId: sessionUser.membershipId,
      companyId: sessionUser.companyId,
      role: sessionUser.role,
    }),
    user: sessionUser,
  };
}
