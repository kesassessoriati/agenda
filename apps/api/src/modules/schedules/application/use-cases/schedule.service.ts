import { ScheduleUserRole, type Prisma } from "@prisma/client";

import { isWorkspaceAdmin, type AuthContext } from "../../../../shared/auth/context.js";
import { env } from "../../../../shared/config/env.js";
import { AppError } from "../../../../shared/errors/app-error.js";
import { demoStore } from "../../../../shared/lib/demo-store.js";
import { prisma } from "../../../../shared/lib/prisma.js";
import { createScheduleSchema, listSchedulesQuerySchema, updateScheduleSchema } from "../dto/schedule.schemas.js";

const scheduleInclude = {
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
    orderBy: {
      createdAt: "asc",
    },
  },
  workingHours: {
    orderBy: {
      dayOfWeek: "asc",
    },
  },
  googleCalendarIntegration: {
    select: {
      id: true,
      email: true,
      calendarId: true,
      active: true,
      lastSyncedAt: true,
      createdAt: true,
    },
  },
  _count: {
    select: {
      appointments: true,
    },
  },
} satisfies Prisma.ScheduleInclude;

async function getAccessibleScheduleIds(auth: AuthContext) {
  if (isWorkspaceAdmin(auth.role)) {
    return undefined;
  }

  const assignments = await prisma.scheduleUser.findMany({
    where: {
      companyId: auth.companyId,
      userId: auth.userId,
    },
    select: {
      scheduleId: true,
    },
  });

  return assignments.map((assignment) => assignment.scheduleId);
}

async function assertScheduleAccess(auth: AuthContext, scheduleId: string) {
  const schedule = await prisma.schedule.findFirst({
    where: {
      id: scheduleId,
      companyId: auth.companyId,
    },
    include: scheduleInclude,
  });

  if (!schedule) {
    throw new AppError("Agenda não encontrada.", 404);
  }

  if (isWorkspaceAdmin(auth.role)) {
    return schedule;
  }

  const hasAccess = schedule.ownerId === auth.userId || schedule.assignments.some((assignment) => assignment.userId === auth.userId);
  if (!hasAccess) {
    throw new AppError("Você não tem permissão para acessar esta agenda.", 403);
  }

  return schedule;
}

async function assertTenantUsers(companyId: string, userIds: string[]) {
  const memberships = await prisma.membership.findMany({
    where: {
      companyId,
      active: true,
      userId: { in: userIds },
    },
    select: { userId: true },
  });

  if (memberships.length !== userIds.length) {
    throw new AppError("Há usuários inválidos na configuração da agenda.", 422);
  }
}

function defaultWorkingHours() {
  return [1, 2, 3, 4, 5].map((dayOfWeek) => ({
    dayOfWeek,
    startTime: "09:00",
    endTime: "18:00",
    breakStart: "12:00",
    breakEnd: "13:00",
    active: true,
  }));
}

export async function listSchedules(auth: AuthContext, query: unknown) {
  const filters = listSchedulesQuerySchema.parse(query);

  if (env.DEMO_MODE) {
    const schedules = demoStore
      .listSchedules(auth)
      .filter((item) => (typeof filters.active === "boolean" ? item.active === filters.active : true))
      .filter((item) =>
        filters.search
          ? [item.name, item.description].filter(Boolean).some((field) => String(field).toLowerCase().includes(filters.search!.toLowerCase()))
          : true,
      );
    return { schedules };
  }

  const accessibleIds = await getAccessibleScheduleIds(auth);

  const schedules = await prisma.schedule.findMany({
    where: {
      companyId: auth.companyId,
      ...(accessibleIds ? { id: { in: accessibleIds } } : {}),
      ...(typeof filters.active === "boolean" ? { active: filters.active } : {}),
      ...(filters.search
        ? {
            OR: [
              { name: { contains: filters.search, mode: "insensitive" } },
              { description: { contains: filters.search, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    include: scheduleInclude,
    orderBy: [{ active: "desc" }, { name: "asc" }],
  });

  return { schedules };
}

export async function getSchedule(auth: AuthContext, scheduleId: string) {
  if (env.DEMO_MODE) {
    return demoStore.getSchedule(auth, scheduleId);
  }
  return assertScheduleAccess(auth, scheduleId);
}

export async function createSchedule(auth: AuthContext, input: unknown) {
  const payload = createScheduleSchema.parse(input);

  if (env.DEMO_MODE) {
    return demoStore.createSchedule(auth, {
      ...payload,
      assignedUserIds: payload.assignedUserIds,
      workingHours: payload.workingHours.map((item) => ({
        id: "",
        ...item,
        breakStart: item.breakStart ?? null,
        breakEnd: item.breakEnd ?? null,
      })),
    });
  }

  const ownerId = isWorkspaceAdmin(auth.role) ? payload.ownerId ?? auth.userId : auth.userId;
  const assignedUserIds = Array.from(new Set([ownerId, ...payload.assignedUserIds]));
  await assertTenantUsers(auth.companyId, assignedUserIds);

  return prisma.schedule.create({
    data: {
      companyId: auth.companyId,
      ownerId,
      name: payload.name,
      description: payload.description ?? null,
      active: payload.active,
      color: payload.color,
      timezone: payload.timezone,
      assignments: {
        create: assignedUserIds.map((userId) => ({
          companyId: auth.companyId,
          userId,
          role: userId === ownerId ? ScheduleUserRole.OWNER : ScheduleUserRole.EDITOR,
        })),
      },
      workingHours: {
        create: (payload.workingHours.length ? payload.workingHours : defaultWorkingHours()).map((item) => ({
          companyId: auth.companyId,
          dayOfWeek: item.dayOfWeek,
          startTime: item.startTime,
          endTime: item.endTime,
          breakStart: item.breakStart ?? null,
          breakEnd: item.breakEnd ?? null,
          active: item.active,
        })),
      },
    },
    include: scheduleInclude,
  });
}

export async function updateSchedule(auth: AuthContext, scheduleId: string, input: unknown) {
  const payload = updateScheduleSchema.parse(input);

  if (env.DEMO_MODE) {
    return demoStore.updateSchedule(auth, scheduleId, {
      ...payload,
      assignedUserIds: payload.assignedUserIds,
      workingHours: payload.workingHours?.map((item) => ({
        id: "",
        ...item,
        breakStart: item.breakStart ?? null,
        breakEnd: item.breakEnd ?? null,
      })),
    });
  }

  const current = await assertScheduleAccess(auth, scheduleId);

  const ownerId = isWorkspaceAdmin(auth.role) ? payload.ownerId ?? current.ownerId : current.ownerId;
  const assignedUserIds =
    isWorkspaceAdmin(auth.role) && payload.assignedUserIds
      ? Array.from(new Set([ownerId, ...payload.assignedUserIds]))
      : current.assignments.map((assignment) => assignment.userId);

  if (isWorkspaceAdmin(auth.role) && payload.assignedUserIds) {
    await assertTenantUsers(auth.companyId, assignedUserIds);
  }

  await prisma.$transaction(async (tx) => {
    await tx.schedule.update({
      where: { id: scheduleId },
      data: {
        ownerId,
        name: payload.name ?? current.name,
        description: payload.description === undefined ? current.description : payload.description,
        active: payload.active ?? current.active,
        color: payload.color ?? current.color,
        timezone: payload.timezone ?? current.timezone,
      },
    });

    if (isWorkspaceAdmin(auth.role) && payload.assignedUserIds) {
      await tx.scheduleUser.deleteMany({ where: { scheduleId } });
      await tx.scheduleUser.createMany({
        data: assignedUserIds.map((userId) => ({
          companyId: auth.companyId,
          scheduleId,
          userId,
          role: userId === ownerId ? ScheduleUserRole.OWNER : ScheduleUserRole.EDITOR,
        })),
      });
    }

    if (payload.workingHours) {
      await tx.workingHours.deleteMany({ where: { scheduleId } });
      await tx.workingHours.createMany({
        data: payload.workingHours.map((item) => ({
          companyId: auth.companyId,
          scheduleId,
          dayOfWeek: item.dayOfWeek,
          startTime: item.startTime,
          endTime: item.endTime,
          breakStart: item.breakStart ?? null,
          breakEnd: item.breakEnd ?? null,
          active: item.active,
        })),
      });
    }
  });

  return assertScheduleAccess(auth, scheduleId);
}

export async function deleteSchedule(auth: AuthContext, scheduleId: string) {
  if (env.DEMO_MODE) {
    return demoStore.deleteSchedule(auth, scheduleId);
  }
  await assertScheduleAccess(auth, scheduleId);
  await prisma.schedule.delete({ where: { id: scheduleId } });
  return { success: true };
}

export async function unlinkGoogleCalendar(auth: AuthContext, scheduleId: string) {
  if (env.DEMO_MODE) {
    return { success: true };
  }
  await assertScheduleAccess(auth, scheduleId);
  await prisma.googleCalendarIntegration.deleteMany({
    where: {
      companyId: auth.companyId,
      scheduleId,
    },
  });
  return { success: true };
}
