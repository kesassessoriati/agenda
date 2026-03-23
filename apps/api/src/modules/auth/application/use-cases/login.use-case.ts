import { compare } from "bcryptjs";
import { MembershipRole } from "@prisma/client";
import { z } from "zod";

import { buildAuthSession, getSessionUser, resolvePreferredMembership, signAuthToken } from "../../../../shared/auth/session.js";
import { env } from "../../../../shared/config/env.js";
import { AppError } from "../../../../shared/errors/app-error.js";
import { demoStore } from "../../../../shared/lib/demo-store.js";
import { prisma } from "../../../../shared/lib/prisma.js";

const loginSchema = z.object({
  email: z.email("Informe um e-mail válido."),
  password: z.string().min(6, "A senha precisa ter ao menos 6 caracteres."),
  workspaceSlug: z.string().optional(),
});

export async function loginUseCase(input: unknown) {
  const payload = loginSchema.parse(input);

  if (env.DEMO_MODE) {
    const user = demoStore.findUserByEmail(payload.email);

    if (!user) {
      throw new AppError("Credenciais inválidas.", 401);
    }

    const passwordMatches = await compare(payload.password, user.passwordHash);
    if (!passwordMatches) {
      throw new AppError("Credenciais inválidas.", 401);
    }

    const membershipId = user.role === MembershipRole.OWNER ? "demo-membership-owner" : "demo-membership-member";
    const token = signAuthToken({
      userId: user.id,
      membershipId,
      companyId: user.companyId,
      role: user.role,
    });

    return {
      token,
      user: {
        id: user.id,
        membershipId,
        companyId: user.companyId,
        name: user.name,
        email: user.email,
        color: user.color ?? null,
        role: user.role,
        timezone: user.timezone,
        company: {
          id: demoStore.company.id,
          name: demoStore.company.name,
          slug: demoStore.company.slug,
          timezone: demoStore.company.timezone,
        },
        memberships: [
          {
            id: membershipId,
            companyId: demoStore.company.id,
            role: user.role,
            joinedAt: user.createdAt,
            lastAccessedAt: user.updatedAt,
            company: {
              id: demoStore.company.id,
              name: demoStore.company.name,
              slug: demoStore.company.slug,
              timezone: demoStore.company.timezone,
            },
          },
        ],
      },
    };
  }

  const user = await prisma.user.findUnique({
    where: {
      email: payload.email,
    },
  });

  if (!user || !user.active) {
    throw new AppError("Credenciais inválidas.", 401);
  }

  const passwordMatches = await compare(payload.password, user.passwordHash);
  if (!passwordMatches) {
    throw new AppError("Credenciais inválidas.", 401);
  }

  const membership = await resolvePreferredMembership(user.id, payload.workspaceSlug);
  return buildAuthSession(user.id, membership.id);
}

export async function meUseCase(auth: { userId: string; membershipId: string }) {
  if (env.DEMO_MODE) {
    const user = demoStore.findUserById(auth.userId);

    if (!user) {
      throw new AppError("Usuário não encontrado.", 404);
    }

    const membershipId = user.role === MembershipRole.OWNER ? "demo-membership-owner" : "demo-membership-member";

    return {
      id: user.id,
      membershipId,
      companyId: user.companyId,
      name: user.name,
      email: user.email,
      color: user.color ?? null,
      role: user.role,
      timezone: user.timezone,
      company: {
        id: demoStore.company.id,
        name: demoStore.company.name,
        slug: demoStore.company.slug,
        timezone: demoStore.company.timezone,
      },
      memberships: [
        {
          id: membershipId,
          companyId: demoStore.company.id,
          role: user.role,
          joinedAt: user.createdAt,
          lastAccessedAt: user.updatedAt,
          company: {
            id: demoStore.company.id,
            name: demoStore.company.name,
            slug: demoStore.company.slug,
            timezone: demoStore.company.timezone,
          },
        },
      ],
    };
  }

  return getSessionUser(auth.userId, auth.membershipId);
}
