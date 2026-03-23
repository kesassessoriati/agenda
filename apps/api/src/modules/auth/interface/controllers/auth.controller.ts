import type { Request, Response } from "express";

import { buildAuthSession, getMembershipByIdForUser } from "../../../../shared/auth/session.js";
import { AppError } from "../../../../shared/errors/app-error.js";
import { loginUseCase, meUseCase } from "../../application/use-cases/login.use-case.js";

export const authController = {
  async login(request: Request, response: Response) {
    const result = await loginUseCase(request.body);
    return response.json(result);
  },

  async me(request: Request, response: Response) {
    if (!request.auth) {
      throw new AppError("Sessão inválida.", 401);
    }

    const result = await meUseCase(request.auth);
    return response.json(result);
  },

  async switchWorkspace(request: Request, response: Response) {
    if (!request.auth) {
      throw new AppError("Sessão inválida.", 401);
    }

    const membershipId = typeof request.body?.membershipId === "string" ? request.body.membershipId : undefined;
    if (!membershipId) {
      throw new AppError("Informe o workspace a ser ativado.", 422);
    }

    const membership = await getMembershipByIdForUser(request.auth.userId, membershipId);
    if (!membership) {
      throw new AppError("Workspace inválido para este usuário.", 403);
    }

    const result = await buildAuthSession(request.auth.userId, membership.id);
    return response.json(result);
  },
};
