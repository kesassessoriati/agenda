import { hash } from "bcryptjs";

import { isSuperAdmin, type AuthContext } from "../../../../shared/auth/context.js";
import { AppError } from "../../../../shared/errors/app-error.js";
import { generateUniqueCompanySlug } from "../../../../shared/lib/company-slug.js";
import { prisma } from "../../../../shared/lib/prisma.js";
import { createPlatformCompanySchema, updatePlatformCompanySchema } from "../dto/platform-company.schemas.js";

function assertPlatformSuperAdmin(auth: AuthContext) {
  if (!isSuperAdmin(auth.platformRole)) {
    throw new AppError("Apenas o superadmin da plataforma pode executar esta ação.", 403);
  }
}

function serializeCompanyOverview(company: {
  id: string;
  name: string;
  slug: string;
  timezone: string;
  plan: "FREE" | "BASIC" | "PREMIUM";
  createdAt: Date;
  updatedAt: Date;
  _count: {
    memberships: number;
    schedules: number;
    appointments: number;
    invitations: number;
  };
  memberships: Array<{
    role: "OWNER" | "ADMIN" | "MEMBER";
    active: boolean;
    user: {
      id: string;
      name: string;
      email: string;
    };
  }>;
}) {
  const activeMemberships = company.memberships.filter((membership) => membership.active);
  const owners = activeMemberships.filter((membership) => membership.role === "OWNER");
  const admins = activeMemberships.filter((membership) => membership.role === "ADMIN");

  return {
    id: company.id,
    name: company.name,
    slug: company.slug,
    timezone: company.timezone,
    plan: company.plan,
    createdAt: company.createdAt,
    updatedAt: company.updatedAt,
    metrics: {
      memberships: company._count.memberships,
      activeMemberships: activeMemberships.length,
      owners: owners.length,
      admins: admins.length,
      schedules: company._count.schedules,
      appointments: company._count.appointments,
      invitations: company._count.invitations,
    },
    owners: owners.map((membership) => membership.user),
  };
}

export async function listPlatformCompanies(auth: AuthContext) {
  assertPlatformSuperAdmin(auth);

  const companies = await prisma.company.findMany({
    include: {
      memberships: {
        where: {
          active: true,
          role: {
            in: ["OWNER", "ADMIN"],
          },
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      },
      _count: {
        select: {
          memberships: true,
          schedules: true,
          appointments: true,
          invitations: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return {
    companies: companies.map(serializeCompanyOverview),
  };
}

export async function getPlatformCompanyDetails(auth: AuthContext, companyId: string) {
  assertPlatformSuperAdmin(auth);

  const company = await prisma.company.findUnique({
    where: {
      id: companyId,
    },
    include: {
      memberships: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              active: true,
              platformRole: true,
            },
          },
        },
        orderBy: [{ role: "asc" }, { createdAt: "asc" }],
      },
      invitations: {
        orderBy: {
          createdAt: "desc",
        },
        take: 10,
        select: {
          id: true,
          email: true,
          role: true,
          acceptedAt: true,
          revokedAt: true,
          expiresAt: true,
          createdAt: true,
        },
      },
      _count: {
        select: {
          memberships: true,
          schedules: true,
          appointments: true,
          invitations: true,
        },
      },
    },
  });

  if (!company) {
    throw new AppError("Empresa não encontrada.", 404);
  }

  return {
    company: {
      ...serializeCompanyOverview({
        ...company,
        memberships: company.memberships.map((membership) => ({
          role: membership.role,
          active: membership.active,
          user: {
            id: membership.user.id,
            name: membership.user.name,
            email: membership.user.email,
          },
        })),
      }),
      members: company.memberships.map((membership) => ({
        id: membership.id,
        role: membership.role,
        active: membership.active,
        joinedAt: membership.joinedAt,
        lastAccessedAt: membership.lastAccessedAt,
        user: membership.user,
      })),
      invitations: company.invitations,
    },
  };
}

export async function createPlatformCompany(auth: AuthContext, input: unknown) {
  assertPlatformSuperAdmin(auth);
  const payload = createPlatformCompanySchema.parse(input);
  const ownerEmail = payload.ownerEmail.trim().toLowerCase();
  const requestedSlug = payload.companySlug?.trim();
  const companySlug = await generateUniqueCompanySlug(requestedSlug || payload.companyName);

  const existingUser = await prisma.user.findUnique({
    where: {
      email: ownerEmail,
    },
  });

  if (!existingUser && !payload.ownerName) {
    throw new AppError("Informe o nome do responsável da empresa.", 422);
  }

  if (!existingUser && !payload.ownerPassword) {
    throw new AppError("Informe uma senha para criar o responsável da empresa.", 422);
  }

  const company = await prisma.$transaction(async (tx) => {
    const createdCompany = await tx.company.create({
      data: {
        name: payload.companyName,
        slug: companySlug,
        timezone: payload.timezone,
        plan: payload.plan,
      },
    });

    const ownerUser =
      existingUser
        ? await tx.user.update({
            where: { id: existingUser.id },
            data: {
              active: true,
            },
          })
        : await tx.user.create({
            data: {
              name: payload.ownerName!,
              email: ownerEmail,
              passwordHash: await hash(payload.ownerPassword!, 10),
              timezone: payload.timezone,
            },
          });

    await tx.membership.create({
      data: {
        companyId: createdCompany.id,
        userId: ownerUser.id,
        role: "OWNER",
        active: true,
        invitedById: auth.userId,
      },
    });

    return createdCompany;
  });

  return getPlatformCompanyDetails(auth, company.id);
}

export async function updatePlatformCompany(auth: AuthContext, companyId: string, input: unknown) {
  assertPlatformSuperAdmin(auth);
  const payload = updatePlatformCompanySchema.parse(input);

  const current = await prisma.company.findUnique({
    where: {
      id: companyId,
    },
  });

  if (!current) {
    throw new AppError("Empresa não encontrada.", 404);
  }

  const nextSlug =
    payload.companySlug !== undefined
      ? await generateUniqueCompanySlug(payload.companySlug, companyId)
      : payload.companyName
        ? await generateUniqueCompanySlug(payload.companyName, companyId)
        : current.slug;

  await prisma.company.update({
    where: {
      id: companyId,
    },
    data: {
      name: payload.companyName ?? current.name,
      slug: nextSlug,
      timezone: payload.timezone ?? current.timezone,
      plan: payload.plan ?? current.plan,
    },
  });

  return getPlatformCompanyDetails(auth, companyId);
}

export async function deletePlatformCompany(auth: AuthContext, companyId: string) {
  assertPlatformSuperAdmin(auth);

  const company = await prisma.company.findUnique({
    where: {
      id: companyId,
    },
    include: {
      memberships: {
        where: {
          active: true,
        },
        include: {
          user: {
            select: {
              id: true,
              platformRole: true,
            },
          },
        },
      },
    },
  });

  if (!company) {
    throw new AppError("Empresa não encontrada.", 404);
  }

  if (company.id === auth.companyId) {
    throw new AppError("Altere para outro workspace antes de excluir a empresa atualmente ativa na sua sessão.", 409);
  }

  for (const membership of company.memberships) {
    if (membership.user.platformRole !== "SUPERADMIN") {
      continue;
    }

    const remainingMemberships = await prisma.membership.count({
      where: {
        userId: membership.user.id,
        active: true,
        companyId: {
          not: company.id,
        },
      },
    });

    if (remainingMemberships === 0) {
      throw new AppError("Esta exclusão removeria o último workspace disponível de um superadmin da plataforma.", 409);
    }
  }

  await prisma.company.delete({
    where: {
      id: company.id,
    },
  });

  return { success: true };
}
