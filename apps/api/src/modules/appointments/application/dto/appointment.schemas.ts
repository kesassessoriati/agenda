import { AppointmentStatus } from "@prisma/client";
import { z } from "zod";

const statusEnum = z.enum(AppointmentStatus);

const appointmentBaseSchema = z.object({
  scheduleId: z.string().min(1),
  title: z.string().min(2).max(200),
  description: z.string().max(2000).optional().nullable(),
  startAt: z.iso.datetime(),
  endAt: z.iso.datetime().optional(),
  durationMinutes: z.coerce.number().int().min(1).max(1440).default(60),
  status: statusEnum.default("SCHEDULED"),
  serviceName: z.string().max(200).optional().nullable(),
  customerName: z.string().max(200).optional().nullable(),
  customerEmail: z.email().optional().nullable(),
  organizerEmail: z.email().optional().nullable(),
  participantEmails: z.array(z.email()).default([]),
  meetingLink: z.url().optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
});

export const createAppointmentSchema = appointmentBaseSchema;

export const updateAppointmentSchema = appointmentBaseSchema.partial();

export const listAppointmentsQuerySchema = z.object({
  scheduleId: z.string().optional(),
  status: statusEnum.optional(),
  search: z.string().optional(),
  startDate: z.iso.date().optional(),
  endDate: z.iso.date().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});
