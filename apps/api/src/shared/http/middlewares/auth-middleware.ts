import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";

import { env } from "../../config/env.js";
import { AppError } from "../../errors/app-error.js";

type JwtPayload = {
  sub: string;
  companyId: string;
  role: "ADMIN" | "MEMBER";
};

export function authMiddleware(request: Request, _response: Response, next: NextFunction) {
  const header = request.headers.authorization;

  if (!header) {
    throw new AppError("Token de autenticação não informado.", 401);
  }

  const [, token] = header.split(" ");

  if (!token) {
    throw new AppError("Token de autenticação inválido.", 401);
  }

  const payload = jwt.verify(token, env.JWT_SECRET) as JwtPayload;

  request.auth = {
    userId: payload.sub,
    companyId: payload.companyId,
    role: payload.role,
  };

  return next();
}
