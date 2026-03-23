import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(3333),
  DATABASE_URL: z
    .string()
    .default("postgresql://postgres:postgres@localhost:5432/kes_meeting_platform?schema=public"),
  JWT_SECRET: z.string().default("kes-dev-secret"),
  JWT_EXPIRES_IN: z.string().default("8h"),
  WEB_URL: z.string().default("http://localhost:5173"),
  API_URL: z.string().default("http://localhost:3333"),
  DEMO_MODE: z
    .string()
    .optional()
    .transform((value) => value === "true"),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_REDIRECT_URI: z.string().optional(),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().optional(),
  SMTP_SECURE: z
    .string()
    .optional()
    .transform((v) => v === "true"),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().optional(),
});

export const env = envSchema.parse(process.env);

export const googleCalendarEnabled =
  Boolean(env.GOOGLE_CLIENT_ID) &&
  Boolean(env.GOOGLE_CLIENT_SECRET) &&
  Boolean(env.GOOGLE_REDIRECT_URI);

export const smtpEnabled =
  Boolean(env.SMTP_HOST) &&
  Boolean(env.SMTP_USER) &&
  Boolean(env.SMTP_PASS);
