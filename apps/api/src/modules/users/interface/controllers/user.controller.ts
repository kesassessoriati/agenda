import type { Request, Response } from "express";

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

    const users = await prisma.user.findMany({
      where: {
        companyId: request.auth.companyId,
        active: true,
        ...(request.auth.role === "ADMIN" ? {} : { id: request.auth.userId }),
      },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        color: true,
        timezone: true,
      },
    });

    return response.json({ users });
  },
};
