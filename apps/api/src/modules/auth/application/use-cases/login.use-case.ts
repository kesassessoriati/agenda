import { compare } from "bcryptjs";
import jwt, { type SignOptions } from "jsonwebtoken";
import { z } from "zod";

import { env } from "../../../../shared/config/env.js";
import { AppError } from "../../../../shared/errors/app-error.js";
import { demoStore } from "../../../../shared/lib/demo-store.js";
import { prisma } from "../../../../shared/lib/prisma.js";

const loginSchema = z.object({
  email: z.email("Informe um e-mail válido."),
  password: z.string().min(6, "A senha precisa ter ao menos 6 caracteres."),
});

export async function loginUseCase(input: unknown) {
  const payload = loginSchema.parse(input);

  if (env.DEMO_MODE) {
    const user = demoStore.findUserByEmail(payload.email);

    if (!user) {
      throw new AppError("Credenciais invÃ¡lidas.", 401);
    }

    const passwordMatches = await compare(payload.password, user.passwordHash);
    if (!passwordMatches) {
      throw new AppError("Credenciais invÃ¡lidas.", 401);
    }

    const token = jwt.sign(
      {
        companyId: user.companyId,
        role: user.role,
      },
      env.JWT_SECRET,
      {
        subject: user.id,
        expiresIn: env.JWT_EXPIRES_IN as SignOptions["expiresIn"],
      },
    );

    return {
      token,
      user: {
        id: user.id,
        companyId: user.companyId,
        name: user.name,
        email: user.email,
        role: user.role,
        timezone: user.timezone,
        company: {
          id: demoStore.company.id,
          name: demoStore.company.name,
          slug: demoStore.company.slug,
        },
      },
    };
  }

  const user = await prisma.user.findFirst({
    where: {
      email: payload.email,
      active: true,
    },
    include: {
      company: true,
    },
  });

  if (!user) {
    throw new AppError("Credenciais inválidas.", 401);
  }

  const passwordMatches = await compare(payload.password, user.passwordHash);
  if (!passwordMatches) {
    throw new AppError("Credenciais inválidas.", 401);
  }

  const token = jwt.sign(
    {
      companyId: user.companyId,
      role: user.role,
    },
    env.JWT_SECRET,
    {
      subject: user.id,
      expiresIn: env.JWT_EXPIRES_IN as SignOptions["expiresIn"],
    },
  );

  return {
    token,
    user: {
      id: user.id,
      companyId: user.companyId,
      name: user.name,
      email: user.email,
      role: user.role,
      timezone: user.timezone,
      company: {
        id: user.company.id,
        name: user.company.name,
        slug: user.company.slug,
      },
    },
  };
}

export async function meUseCase(auth: { userId: string; companyId: string }) {
  if (env.DEMO_MODE) {
    const user = demoStore.findUserById(auth.userId);

    if (!user) {
      throw new AppError("UsuÃ¡rio nÃ£o encontrado.", 404);
    }

    return {
      id: user.id,
      companyId: user.companyId,
      name: user.name,
      email: user.email,
      role: user.role,
      timezone: user.timezone,
      company: {
        id: demoStore.company.id,
        name: demoStore.company.name,
        slug: demoStore.company.slug,
      },
    };
  }

  const user = await prisma.user.findFirst({
    where: {
      id: auth.userId,
      companyId: auth.companyId,
      active: true,
    },
    include: {
      company: true,
    },
  });

  if (!user) {
    throw new AppError("Usuário não encontrado.", 404);
  }

  return {
    id: user.id,
    companyId: user.companyId,
    name: user.name,
    email: user.email,
    role: user.role,
    timezone: user.timezone,
    company: {
      id: user.company.id,
      name: user.company.name,
      slug: user.company.slug,
    },
  };
}
