import { hash, compare } from "bcryptjs";

import { buildAuthSession } from "../../../../shared/auth/session.js";
import { AppError } from "../../../../shared/errors/app-error.js";
import { generateUniqueCompanySlug } from "../../../../shared/lib/company-slug.js";
import { prisma } from "../../../../shared/lib/prisma.js";
import { registerWorkspaceSchema } from "../dto/workspace.schemas.js";

export async function registerWorkspace(input: unknown) {
  const payload = registerWorkspaceSchema.parse(input);
  const email = payload.email.trim().toLowerCase();
  const requestedSlug = payload.companySlug?.trim();
  const companySlug = await generateUniqueCompanySlug(requestedSlug || payload.companyName);

  const existingUser = await prisma.user.findUnique({
    where: {
      email,
    },
  });

  if (existingUser) {
    const passwordMatches = await compare(payload.password, existingUser.passwordHash);
    if (!passwordMatches) {
      throw new AppError("Já existe uma conta com este e-mail. Informe a senha correta para criar outro workspace.", 401);
    }
  }

  if (!existingUser && !payload.ownerName) {
    throw new AppError("Informe o nome do responsável pelo workspace.", 422);
  }

  const result = await prisma.$transaction(async (tx) => {
    const company = await tx.company.create({
      data: {
        name: payload.companyName,
        slug: companySlug,
        timezone: payload.timezone,
        plan: "FREE",
      },
    });

    const user =
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
              email,
              passwordHash: await hash(payload.password, 10),
              timezone: payload.timezone,
            },
          });

    const membership = await tx.membership.create({
      data: {
        companyId: company.id,
        userId: user.id,
        role: "OWNER",
        active: true,
      },
    });

    return {
      userId: user.id,
      membershipId: membership.id,
    };
  });

  return buildAuthSession(result.userId, result.membershipId);
}
