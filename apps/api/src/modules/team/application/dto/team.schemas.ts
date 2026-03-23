import { MembershipRole } from "@prisma/client";
import { z } from "zod";

const membershipRoleEnum = z.enum(MembershipRole);

export const createInvitationSchema = z.object({
  email: z.email("Informe um e-mail válido."),
  role: membershipRoleEnum.default("MEMBER"),
  expiresInDays: z.coerce.number().int().min(1).max(30).default(7),
});

export const updateMemberSchema = z
  .object({
    role: membershipRoleEnum.optional(),
    active: z.boolean().optional(),
  })
  .refine((value) => value.role !== undefined || value.active !== undefined, {
    message: "Informe ao menos um campo para atualização.",
  });

export const acceptInvitationSchema = z.object({
  name: z.string().min(2).max(120).optional(),
  password: z.string().min(6, "A senha precisa ter ao menos 6 caracteres."),
  timezone: z.string().min(3).default("America/Sao_Paulo"),
  color: z.string().max(20).optional().nullable(),
});
