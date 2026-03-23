import type { Request, Response } from "express";

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
};
