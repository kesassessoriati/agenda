import { AppointmentStatus, type Prisma } from "@prisma/client";

import { isWorkspaceAdmin, type AuthContext } from "../../../../shared/auth/context.js";
import { env } from "../../../../shared/config/env.js";
import { AppError } from "../../../../shared/errors/app-error.js";
import { demoStore } from "../../../../shared/lib/demo-store.js";
import { prisma } from "../../../../shared/lib/prisma.js";
import {
  createGoogleCalendarEvent,
  deleteGoogleCalendarEvent,
  syncGoogleCalendar,
  updateGoogleCalendarEvent,
} from "../../../google-calendar/application/services/google-calendar.service.js";
import { createAppointmentSchema, listAppointmentsQuerySchema, updateAppointmentSchema } from "../dto/appointment.schemas.js";
import { assertScheduleAvailability, buildAppointmentWhere, buildAppointmentWindow } from "./availability.service.js";

const appointmentInclude = {
  schedule: {
    include: {
      owner: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      assignments: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              color: true,
            },
          },
        },
      },
      googleCalendarIntegration: {
        select: {
          id: true,
          email: true,
          active: true,
          lastSyncedAt: true,
        },
      },
    },
  },
  createdBy: {
    select: {
      id: true,
      name: true,
      email: true,
    },
  },
  updatedBy: {
    select: {
      id: true,
      name: true,
      email: true,
    },
  },
} satisfies Prisma.AppointmentInclude;

async function getAccessibleScheduleIds(auth: AuthContext) {
  if (isWorkspaceAdmin(auth.role)) {
    return undefined;
  }

  const assignments = await prisma.scheduleUser.findMany({
    where: {
      companyId: auth.companyId,
      userId: auth.userId,
    },
    select: { scheduleId: true },
  });

  return assignments.map((item) => item.scheduleId);
}

async function getScheduleForOperation(auth: AuthContext, scheduleId: string) {
  const accessibleIds = await getAccessibleScheduleIds(auth);
  const schedule = await prisma.schedule.findFirst({
    where: {
      id: scheduleId,
      companyId: auth.companyId,
      ...(accessibleIds ? { id: { in: accessibleIds } } : {}),
    },
    include: {
      workingHours: { orderBy: { dayOfWeek: "asc" } },
      googleCalendarIntegration: true,
    },
  });

  if (!schedule) {
    throw new AppError("Agenda não encontrada ou sem permissão de acesso.", 404);
  }

  return schedule;
}

async function getAppointmentForOperation(auth: AuthContext, appointmentId: string) {
  const accessibleIds = await getAccessibleScheduleIds(auth);
  const appointment = await prisma.appointment.findFirst({
    where: {
      id: appointmentId,
      companyId: auth.companyId,
      ...(accessibleIds ? { scheduleId: { in: accessibleIds } } : {}),
    },
    include: appointmentInclude,
  });

  if (!appointment) {
    throw new AppError("Compromisso não encontrado.", 404);
  }

  return appointment;
}

export async function listAppointments(auth: AuthContext, query: unknown) {
  const filters = listAppointmentsQuerySchema.parse(query);

  if (env.DEMO_MODE) {
    return demoStore.listAppointments(auth, filters);
  }

  const accessibleIds = await getAccessibleScheduleIds(auth);

  if (accessibleIds && accessibleIds.length === 0) {
    return {
      appointments: [],
      stats: { total: 0, scheduled: 0, confirmed: 0, completed: 0, cancelled: 0, noShow: 0 },
      meta: { page: filters.page, pageSize: filters.pageSize, total: 0 },
    };
  }

  if (filters.scheduleId && accessibleIds && !accessibleIds.includes(filters.scheduleId)) {
    throw new AppError("Você não tem acesso à agenda informada.", 403);
  }

  const where = buildAppointmentWhere({
    companyId: auth.companyId,
    scheduleIds: accessibleIds,
    filters,
  });

  const [appointments, total, grouped] = await Promise.all([
    prisma.appointment.findMany({
      where,
      include: appointmentInclude,
      orderBy: [{ startAt: "asc" }],
      skip: (filters.page - 1) * filters.pageSize,
      take: filters.pageSize,
    }),
    prisma.appointment.count({ where }),
    prisma.appointment.groupBy({
      by: ["status"],
      where,
      _count: { status: true },
    }),
  ]);

  const statsMap = new Map(grouped.map((item) => [item.status, item._count.status]));

  return {
    appointments,
    stats: {
      total,
      scheduled: statsMap.get(AppointmentStatus.SCHEDULED) ?? 0,
      confirmed: statsMap.get(AppointmentStatus.CONFIRMED) ?? 0,
      completed: statsMap.get(AppointmentStatus.COMPLETED) ?? 0,
      cancelled: statsMap.get(AppointmentStatus.CANCELLED) ?? 0,
      noShow: statsMap.get(AppointmentStatus.NO_SHOW) ?? 0,
    },
    meta: { page: filters.page, pageSize: filters.pageSize, total },
  };
}

export async function getAppointment(auth: AuthContext, appointmentId: string) {
  if (env.DEMO_MODE) {
    return demoStore.getAppointment(auth, appointmentId);
  }
  return getAppointmentForOperation(auth, appointmentId);
}

export async function getAppointmentsSummary(auth: AuthContext, query: unknown) {
  const filters = listAppointmentsQuerySchema.parse(query);

  if (env.DEMO_MODE) {
    return demoStore.summary(auth, filters);
  }

  const accessibleIds = await getAccessibleScheduleIds(auth);
  const where = buildAppointmentWhere({
    companyId: auth.companyId,
    scheduleIds: accessibleIds,
    filters,
  });

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);

  const [schedulesCount, linkedSchedulesCount, nextAppointment, todayCount] = await Promise.all([
    prisma.schedule.count({
      where: {
        companyId: auth.companyId,
        ...(accessibleIds ? { id: { in: accessibleIds } } : {}),
        active: true,
      },
    }),
    prisma.schedule.count({
      where: {
        companyId: auth.companyId,
        ...(accessibleIds ? { id: { in: accessibleIds } } : {}),
        googleCalendarIntegration: {
          is: { active: true },
        },
      },
    }),
    prisma.appointment.findFirst({
      where: {
        ...where,
        startAt: { gte: new Date() },
        status: { notIn: [AppointmentStatus.CANCELLED, AppointmentStatus.NO_SHOW] },
      },
      include: appointmentInclude,
      orderBy: { startAt: "asc" },
    }),
    prisma.appointment.count({
      where: {
        ...where,
        startAt: {
          gte: startOfToday,
          lte: endOfToday,
        },
      },
    }),
  ]);

  return { schedulesCount, linkedSchedulesCount, todayCount, nextAppointment };
}

export async function createAppointment(auth: AuthContext, input: unknown) {
  const payload = createAppointmentSchema.parse(input);

  if (env.DEMO_MODE) {
    const { start, end, durationMinutes } = buildAppointmentWindow({
      startAt: payload.startAt,
      endAt: payload.endAt,
      durationMinutes: payload.durationMinutes,
    });

    return demoStore.createAppointment(auth, {
      scheduleId: payload.scheduleId,
      title: payload.title,
      description: payload.description ?? null,
      startAt: start,
      endAt: end,
      durationMinutes,
      status: payload.status,
      serviceName: payload.serviceName ?? null,
      customerName: payload.customerName ?? null,
      customerEmail: payload.customerEmail ?? null,
      organizerEmail: payload.organizerEmail ?? null,
      participantEmails: payload.participantEmails,
      meetingLink: payload.meetingLink ?? null,
      notes: payload.notes ?? null,
    });
  }

  const schedule = await getScheduleForOperation(auth, payload.scheduleId);
  const { start, end, durationMinutes } = buildAppointmentWindow(payload);

  const existingAppointments = await prisma.appointment.findMany({
    where: {
      companyId: auth.companyId,
      scheduleId: payload.scheduleId,
      startAt: { lt: end },
      endAt: { gt: start },
      status: { notIn: [AppointmentStatus.CANCELLED, AppointmentStatus.NO_SHOW] },
    },
    select: {
      id: true,
      title: true,
      startAt: true,
      endAt: true,
      status: true,
    },
  });

  assertScheduleAvailability(schedule, start, end, existingAppointments);

  const appointment = await prisma.appointment.create({
    data: {
      companyId: auth.companyId,
      scheduleId: payload.scheduleId,
      title: payload.title,
      description: payload.description ?? null,
      startAt: start,
      endAt: end,
      durationMinutes,
      status: payload.status,
      serviceName: payload.serviceName ?? null,
      customerName: payload.customerName ?? null,
      customerEmail: payload.customerEmail ?? null,
      organizerEmail: payload.organizerEmail ?? null,
      participantEmails: payload.participantEmails,
      meetingLink: payload.meetingLink ?? null,
      notes: payload.notes ?? null,
      createdById: auth.userId,
      updatedById: auth.userId,
    },
    include: appointmentInclude,
  });

  if (schedule.googleCalendarIntegration?.active) {
    try {
      const syncResult = await createGoogleCalendarEvent(schedule.id, auth.companyId, {
        title: appointment.title,
        description: appointment.description,
        startAt: appointment.startAt,
        endAt: appointment.endAt,
        attendeeEmails: Array.from(
          new Set(
            [appointment.customerEmail, appointment.organizerEmail, ...appointment.participantEmails].filter(Boolean) as string[],
          ),
        ),
      });

      if (syncResult?.externalEventId) {
        return prisma.appointment.update({
          where: { id: appointment.id },
          data: {
            externalEventId: syncResult.externalEventId,
            externalProvider: "google_calendar",
            meetingLink: syncResult.meetingLink ?? appointment.meetingLink,
            organizerEmail: syncResult.organizerEmail ?? appointment.organizerEmail,
            participantEmails: syncResult.participantEmails ?? appointment.participantEmails,
          },
          include: appointmentInclude,
        });
      }
    } catch (error) {
      void error;
    }
  }

  return appointment;
}

export async function updateAppointment(auth: AuthContext, appointmentId: string, input: unknown) {
  const payload = updateAppointmentSchema.parse(input);

  if (env.DEMO_MODE) {
    const current = demoStore.getAppointment(auth, appointmentId);
    const { start, end, durationMinutes } = buildAppointmentWindow({
      startAt: payload.startAt ?? new Date(current.startAt).toISOString(),
      endAt: payload.endAt ?? new Date(current.endAt).toISOString(),
      durationMinutes: payload.durationMinutes ?? current.durationMinutes,
    });

    return demoStore.updateAppointment(auth, appointmentId, {
      scheduleId: payload.scheduleId ?? current.scheduleId,
      title: payload.title ?? current.title,
      description: payload.description === undefined ? current.description : payload.description,
      startAt: start,
      endAt: end,
      durationMinutes,
      status: payload.status ?? current.status,
      serviceName: payload.serviceName === undefined ? current.serviceName : payload.serviceName,
      customerName: payload.customerName === undefined ? current.customerName : payload.customerName,
      customerEmail: payload.customerEmail === undefined ? current.customerEmail : payload.customerEmail,
      organizerEmail: payload.organizerEmail === undefined ? current.organizerEmail : payload.organizerEmail,
      participantEmails: payload.participantEmails ?? current.participantEmails,
      meetingLink: payload.meetingLink === undefined ? current.meetingLink : payload.meetingLink,
      notes: payload.notes === undefined ? current.notes : payload.notes,
    });
  }

  const current = await getAppointmentForOperation(auth, appointmentId);
  const schedule = await getScheduleForOperation(auth, payload.scheduleId ?? current.scheduleId);

  const { start, end, durationMinutes } = buildAppointmentWindow({
    startAt: payload.startAt ?? current.startAt.toISOString(),
    endAt: payload.endAt ?? current.endAt.toISOString(),
    durationMinutes: payload.durationMinutes ?? current.durationMinutes,
  });

  const existingAppointments = await prisma.appointment.findMany({
    where: {
      companyId: auth.companyId,
      scheduleId: schedule.id,
      startAt: { lt: end },
      endAt: { gt: start },
      status: { notIn: [AppointmentStatus.CANCELLED, AppointmentStatus.NO_SHOW] },
    },
    select: {
      id: true,
      title: true,
      startAt: true,
      endAt: true,
      status: true,
    },
  });

  assertScheduleAvailability(schedule, start, end, existingAppointments, current.id);

  const appointment = await prisma.appointment.update({
    where: { id: current.id },
    data: {
      scheduleId: payload.scheduleId ?? current.scheduleId,
      title: payload.title ?? current.title,
      description: payload.description === undefined ? current.description : payload.description,
      startAt: start,
      endAt: end,
      durationMinutes,
      status: payload.status ?? current.status,
      serviceName: payload.serviceName === undefined ? current.serviceName : payload.serviceName,
      customerName: payload.customerName === undefined ? current.customerName : payload.customerName,
      customerEmail: payload.customerEmail === undefined ? current.customerEmail : payload.customerEmail,
      organizerEmail: payload.organizerEmail === undefined ? current.organizerEmail : payload.organizerEmail,
      participantEmails: payload.participantEmails ?? current.participantEmails,
      meetingLink: payload.meetingLink === undefined ? current.meetingLink : payload.meetingLink,
      notes: payload.notes === undefined ? current.notes : payload.notes,
      updatedById: auth.userId,
    },
    include: appointmentInclude,
  });

  if (appointment.externalEventId && schedule.googleCalendarIntegration?.active) {
    try {
      const syncResult = await updateGoogleCalendarEvent(schedule.id, auth.companyId, appointment.externalEventId, {
        title: appointment.title,
        description: appointment.description,
        startAt: appointment.startAt,
        endAt: appointment.endAt,
        attendeeEmails: Array.from(
          new Set(
            [appointment.customerEmail, appointment.organizerEmail, ...appointment.participantEmails].filter(Boolean) as string[],
          ),
        ),
        existingMeetingLink: appointment.meetingLink,
        status: appointment.status === AppointmentStatus.CANCELLED ? "cancelled" : "confirmed",
      });

      if (syncResult) {
        return prisma.appointment.update({
          where: { id: appointment.id },
          data: {
            meetingLink: syncResult.meetingLink ?? appointment.meetingLink,
            organizerEmail: syncResult.organizerEmail ?? appointment.organizerEmail,
            participantEmails: syncResult.participantEmails ?? appointment.participantEmails,
          },
          include: appointmentInclude,
        });
      }
    } catch (error) {
      void error;
    }
  }

  return appointment;
}

export async function deleteAppointment(auth: AuthContext, appointmentId: string) {
  if (env.DEMO_MODE) {
    return demoStore.deleteAppointment(auth, appointmentId);
  }
  const appointment = await getAppointmentForOperation(auth, appointmentId);

  if (appointment.externalEventId) {
    try {
      await deleteGoogleCalendarEvent(appointment.scheduleId, auth.companyId, appointment.externalEventId);
    } catch (error) {
      void error;
    }
  }

  await prisma.appointment.delete({ where: { id: appointment.id } });
  return { success: true };
}

export async function syncAppointmentsFromGoogle(auth: AuthContext, scheduleId?: string) {
  if (env.DEMO_MODE) {
    return {
      imported: 0,
      updated: 0,
      skipped: scheduleId ? 1 : 0,
      errors: ["Modo demonstração local: sincronização com Google Calendar indisponível sem banco/configuração externa."],
    };
  }

  const accessibleIds = await getAccessibleScheduleIds(auth);
  const scheduleIds =
    scheduleId !== undefined
      ? accessibleIds
        ? accessibleIds.filter((id) => id === scheduleId)
        : [scheduleId]
      : accessibleIds ??
        (
          await prisma.schedule.findMany({
            where: {
              companyId: auth.companyId,
              googleCalendarIntegration: {
                is: { active: true },
              },
            },
            select: { id: true },
          })
        ).map((item) => item.id);

  if (scheduleIds.length === 0) {
    return {
      imported: 0,
      updated: 0,
      skipped: 0,
      errors: ["Nenhuma agenda vinculada ao Google Calendar está disponível para sincronização."],
    };
  }

  return syncGoogleCalendar(scheduleIds, auth.companyId);
}
