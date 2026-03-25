import { compare, hash } from "bcryptjs";
import { z } from "zod";

import type { AuthContext } from "../../../../shared/auth/context.js";
import { buildAuthSession } from "../../../../shared/auth/session.js";
import { AppError } from "../../../../shared/errors/app-error.js";
import { prisma } from "../../../../shared/lib/prisma.js";

const updateProfileSchema = z.object({
  name: z.string().min(2, "Informe o nome (mín. 2 caracteres).").max(120),
  email: z.email("Informe um e-mail válido."),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Informe a senha atual."),
  newPassword: z.string().min(6, "A nova senha precisa ter ao menos 6 caracteres."),
});

export async function updateProfileUseCase(auth: AuthContext, input: unknown) {
  const payload = updateProfileSchema.parse(input);

  const existingUser = await prisma.user.findFirst({
    where: {
      email: payload.email,
      NOT: { id: auth.userId },
    },
  });

  if (existingUser) {
    throw new AppError("E-mail já está em uso por outro usuário.", 422);
  }

  await prisma.user.update({
    where: { id: auth.userId },
    data: {
      name: payload.name,
      email: payload.email,
    },
  });

  return buildAuthSession(auth.userId, auth.membershipId);
}

export async function changePasswordUseCase(auth: AuthContext, input: unknown) {
  const payload = changePasswordSchema.parse(input);

  const user = await prisma.user.findUnique({
    where: { id: auth.userId },
  });

  if (!user) {
    throw new AppError("Usuário não encontrado.", 404);
  }

  const currentPasswordMatches = await compare(payload.currentPassword, user.passwordHash);
  if (!currentPasswordMatches) {
    throw new AppError("Senha atual incorreta.", 422);
  }

  const newPasswordHash = await hash(payload.newPassword, 10);

  await prisma.user.update({
    where: { id: auth.userId },
    data: { passwordHash: newPasswordHash },
  });

  return { message: "Senha alterada com sucesso." };
}
