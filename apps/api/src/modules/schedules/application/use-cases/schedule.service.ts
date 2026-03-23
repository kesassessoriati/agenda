import { ScheduleUserRole, UserRole, type Prisma } from "@prisma/client";

import { env } from "../../../../shared/config/env.js";
import { AppError } from "../../../../shared/errors/app-error.js";
import { demoStore } from "../../../../shared/lib/demo-store.js";
import { prisma } from "../../../../shared/lib/prisma.js";
import { createScheduleSchema, listSchedulesQuerySchema, updateScheduleSchema } from "../dto/schedule.schemas.js";

type AuthContext = {
  companyId: string;
  userId: string;
  role: UserRole;
};

const scheduleInclude = {
  owner: {
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
    },
  },
  assignments: {
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
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
  if (auth.role === "ADMIN") {
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

  if (auth.role === "ADMIN") {
    return schedule;
  }

  const hasAccess = schedule.ownerId === auth.userId || schedule.assignments.some((assignment) => assignment.userId === auth.userId);
  if (!hasAccess) {
    throw new AppError("Você não tem permissão para acessar esta agenda.", 403);
  }

  return schedule;
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

  const ownerId = auth.role === "ADMIN" ? payload.ownerId ?? auth.userId : auth.userId;
  const assignedUserIds = Array.from(new Set([ownerId, ...payload.assignedUserIds]));

  const validUsers = await prisma.user.findMany({
    where: {
      companyId: auth.companyId,
      active: true,
      id: { in: assignedUserIds },
    },
    select: { id: true },
  });

  if (validUsers.length !== assignedUserIds.length) {
    throw new AppError("Há usuários inválidos na configuração da agenda.", 422);
  }

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

  const ownerId = auth.role === "ADMIN" ? payload.ownerId ?? current.ownerId : current.ownerId;
  const assignedUserIds =
    auth.role === "ADMIN" && payload.assignedUserIds
      ? Array.from(new Set([ownerId, ...payload.assignedUserIds]))
      : current.assignments.map((assignment) => assignment.userId);

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

    if (auth.role === "ADMIN" && payload.assignedUserIds) {
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
