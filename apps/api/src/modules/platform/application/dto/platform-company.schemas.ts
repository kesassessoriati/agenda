import { CompanyPlan } from "@prisma/client";
import { z } from "zod";

export const companyPlanEnum = z.enum(CompanyPlan);

export const createPlatformCompanySchema = z.object({
  companyName: z.string().min(2).max(120),
  companySlug: z.string().min(2).max(80).optional(),
  timezone: z.string().min(3).default("America/Sao_Paulo"),
  plan: companyPlanEnum.default("FREE"),
  planExpiresAt: z.coerce.date().nullable().optional(),
  ownerName: z.string().min(2).max(120).optional(),
  ownerEmail: z.email("Informe um e-mail válido."),
  ownerPassword: z.string().min(6).optional(),
});

export const updatePlatformCompanySchema = z
  .object({
    companyName: z.string().min(2).max(120).optional(),
    companySlug: z.string().min(2).max(80).optional(),
    timezone: z.string().min(3).optional(),
    plan: companyPlanEnum.optional(),
    planExpiresAt: z.coerce.date().nullable().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "Informe ao menos um campo para atualização.",
  });
