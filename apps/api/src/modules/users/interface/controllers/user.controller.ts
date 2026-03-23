import type { Request, Response } from "express";

import { isWorkspaceAdmin } from "../../../../shared/auth/context.js";
import { env } from "../../../../shared/config/env.js";
import { AppError } from "../../../../shared/errors/app-error.js";
import { demoStore } from "../../../../shared/lib/demo-store.js";
import { prisma } from "../../../../shared/lib/prisma.js";

export const userController = {
  async listAssignable(request: Request, response: Response) {
    if (!request.auth) {
      throw new AppError("Sessão inválida.", 401);
    }

    if (env.DEMO_MODE) {
      return response.json({ users: demoStore.listUsers(request.auth) });
    }

    const memberships = await prisma.membership.findMany({
      where: {
        companyId: request.auth.companyId,
        active: true,
        ...(isWorkspaceAdmin(request.auth.role) ? {} : { userId: request.auth.userId }),
      },
      orderBy: [{ role: "asc" }, { user: { name: "asc" } }],
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            color: true,
            timezone: true,
          },
        },
      },
    });

    return response.json({
      users: memberships.map((membership) => ({
        id: membership.user.id,
        membershipId: membership.id,
        name: membership.user.name,
        email: membership.user.email,
        role: membership.role,
        color: membership.user.color,
        timezone: membership.user.timezone,
      })),
    });
  },
};
