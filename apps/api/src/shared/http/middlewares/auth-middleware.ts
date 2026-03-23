import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";

import { env } from "../../config/env.js";
import { AppError } from "../../errors/app-error.js";
import { getMembershipByIdForUser } from "../../auth/session.js";

type JwtPayload = {
  sub: string;
  membershipId: string;
  companyId: string;
  role: "OWNER" | "ADMIN" | "MEMBER";
};

export async function authMiddleware(request: Request, _response: Response, next: NextFunction) {
  const header = request.headers.authorization;

  if (!header) {
    throw new AppError("Token de autenticação não informado.", 401);
  }

  const [, token] = header.split(" ");

  if (!token) {
    throw new AppError("Token de autenticação inválido.", 401);
  }

  const payload = jwt.verify(token, env.JWT_SECRET) as JwtPayload;

  if (env.DEMO_MODE) {
    request.auth = {
      userId: payload.sub,
      membershipId: payload.membershipId ?? "demo-membership-owner",
      companyId: payload.companyId,
      role: payload.role,
      company: {
        id: payload.companyId,
        name: "KES Demo",
        slug: "kes-demo",
        timezone: "America/Sao_Paulo",
      },
    };

    return next();
  }

  const membership = await getMembershipByIdForUser(payload.sub, payload.membershipId);
  if (!membership) {
    throw new AppError("Sessão expirada ou workspace inválido.", 401);
  }

  request.auth = {
    userId: membership.userId,
    membershipId: membership.id,
    companyId: membership.companyId,
    role: membership.role,
    company: membership.company,
  };

  return next();
}
