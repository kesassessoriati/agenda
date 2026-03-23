import { z } from "zod";

export const registerWorkspaceSchema = z.object({
  companyName: z.string().min(2, "Informe o nome da empresa/workspace.").max(120),
  companySlug: z.string().min(2).max(80).optional(),
  timezone: z.string().min(3).default("America/Sao_Paulo"),
  ownerName: z.string().min(2).max(120).optional(),
  email: z.email("Informe um e-mail válido."),
  password: z.string().min(6, "A senha precisa ter ao menos 6 caracteres."),
});
