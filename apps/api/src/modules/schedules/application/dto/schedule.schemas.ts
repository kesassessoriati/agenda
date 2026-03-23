import { z } from "zod";

export const workingHourSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  breakStart: z.string().regex(/^\d{2}:\d{2}$/).optional().nullable(),
  breakEnd: z.string().regex(/^\d{2}:\d{2}$/).optional().nullable(),
  active: z.boolean().default(true),
});

export const createScheduleSchema = z.object({
  name: z.string().min(2).max(120),
  description: z.string().max(1000).optional().nullable(),
  active: z.boolean().default(true),
  color: z.string().min(4).max(20).default("#2563eb"),
  timezone: z.string().min(3).default("America/Sao_Paulo"),
  ownerId: z.string().optional(),
  assignedUserIds: z.array(z.string()).default([]),
  workingHours: z.array(workingHourSchema).min(1),
});

export const updateScheduleSchema = createScheduleSchema.partial();

export const listSchedulesQuerySchema = z.object({
  search: z.string().optional(),
  active: z
    .enum(["true", "false"])
    .optional()
    .transform((value) => (value === undefined ? undefined : value === "true")),
});
