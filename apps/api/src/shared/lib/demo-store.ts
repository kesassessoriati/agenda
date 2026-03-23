import { AppointmentStatus, MembershipRole, ScheduleUserRole } from "@prisma/client";
import { hashSync } from "bcryptjs";

import { isWorkspaceAdmin } from "../auth/context.js";
import { AppError } from "../errors/app-error.js";
import { dayjs } from "./dayjs.js";

type AuthContext = {
  userId: string;
  companyId: string;
  role: MembershipRole;
};

type DemoUser = {
  id: string;
  companyId: string;
  name: string;
  email: string;
  passwordHash: string;
  role: MembershipRole;
  active: boolean;
  color: string | null;
  timezone: string;
  createdAt: Date;
  updatedAt: Date;
};

type DemoWorkingHour = {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  breakStart: string | null;
  breakEnd: string | null;
  active: boolean;
};

type DemoSchedule = {
  id: string;
  companyId: string;
  ownerId: string;
  name: string;
  description: string | null;
  active: boolean;
  color: string;
  timezone: string;
  assignmentUserIds: string[];
  workingHours: DemoWorkingHour[];
  googleCalendarIntegration: {
    id: string;
    email: string;
    calendarId: string;
    active: boolean;
    lastSyncedAt: Date | null;
    createdAt: Date;
  } | null;
  createdAt: Date;
  updatedAt: Date;
};

type DemoAppointment = {
  id: string;
  companyId: string;
  scheduleId: string;
  title: string;
  description: string | null;
  startAt: Date;
  endAt: Date;
  durationMinutes: number;
  status: AppointmentStatus;
  serviceName: string | null;
  customerName: string | null;
  customerEmail: string | null;
  organizerEmail: string | null;
  participantEmails: string[];
  meetingLink: string | null;
  externalEventId: string | null;
  externalProvider: string | null;
  notes: string | null;
  createdById: string;
  updatedById: string | null;
  createdAt: Date;
  updatedAt: Date;
};

const company = {
  id: "company-demo",
  name: "KES Demo",
  slug: "kes-demo",
  timezone: "America/Sao_Paulo",
};

const users: DemoUser[] = [
  {
    id: "user-admin",
    companyId: company.id,
    name: "Administrador",
    email: "admin@kes.local",
    passwordHash: hashSync("admin123", 10),
    role: MembershipRole.OWNER,
    active: true,
    color: "#0f172a",
    timezone: "America/Sao_Paulo",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "user-member",
    companyId: company.id,
    name: "Consultor Agenda",
    email: "consultor@kes.local",
    passwordHash: hashSync("user12345", 10),
    role: MembershipRole.MEMBER,
    active: true,
    color: "#2563eb",
    timezone: "America/Sao_Paulo",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

const schedules: DemoSchedule[] = [
  {
    id: "schedule-main",
    companyId: company.id,
    ownerId: "user-admin",
    name: "Agenda Comercial",
    description: "Agenda principal para demos e alinhamentos.",
    active: true,
    color: "#2563eb",
    timezone: "America/Sao_Paulo",
    assignmentUserIds: ["user-admin", "user-member"],
    workingHours: [1, 2, 3, 4, 5].map((dayOfWeek) => ({
      id: `wh-${dayOfWeek}`,
      dayOfWeek,
      startTime: "09:00",
      endTime: "18:00",
      breakStart: "12:00",
      breakEnd: "13:00",
      active: true,
    })),
    googleCalendarIntegration: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

const appointments: DemoAppointment[] = [
  {
    id: "appointment-demo",
    companyId: company.id,
    scheduleId: "schedule-main",
    title: "Reunião de descoberta",
    description: "Apresentação inicial do fluxo comercial.",
    startAt: dayjs().add(1, "day").hour(14).minute(0).second(0).millisecond(0).toDate(),
    endAt: dayjs().add(1, "day").hour(15).minute(0).second(0).millisecond(0).toDate(),
    durationMinutes: 60,
    status: AppointmentStatus.SCHEDULED,
    serviceName: "Demonstração",
    customerName: "Cliente Exemplo",
    customerEmail: "cliente@exemplo.com",
    organizerEmail: "admin@kes.local",
    participantEmails: ["consultor@kes.local"],
    meetingLink: null,
    externalEventId: null,
    externalProvider: null,
    notes: "Confirmar material antes da chamada.",
    createdById: "user-admin",
    updatedById: "user-admin",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

function nextId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function getAccessibleSchedules(auth: AuthContext) {
  return isWorkspaceAdmin(auth.role)
    ? schedules.filter((item) => item.companyId === auth.companyId)
    : schedules.filter((item) => item.companyId === auth.companyId && item.assignmentUserIds.includes(auth.userId));
}

function toScheduleResponse(schedule: DemoSchedule) {
  const owner = users.find((user) => user.id === schedule.ownerId)!;
  const assignments = schedule.assignmentUserIds.map((userId) => {
    const user = users.find((item) => item.id === userId)!;
    return {
      id: `assign-${schedule.id}-${user.id}`,
      role: user.id === schedule.ownerId ? ScheduleUserRole.OWNER : ScheduleUserRole.EDITOR,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        color: user.color,
      },
    };
  });

  return {
    ...schedule,
    owner: {
      id: owner.id,
      name: owner.name,
      email: owner.email,
    },
    assignments,
    _count: {
      appointments: appointments.filter((item) => item.scheduleId === schedule.id).length,
    },
  };
}

function toAppointmentResponse(appointment: DemoAppointment) {
  const schedule = schedules.find((item) => item.id === appointment.scheduleId)!;
  const createdBy = users.find((user) => user.id === appointment.createdById)!;
  const updatedBy = appointment.updatedById ? users.find((user) => user.id === appointment.updatedById) : null;

  return {
    ...appointment,
    schedule: toScheduleResponse(schedule),
    createdBy: {
      id: createdBy.id,
      name: createdBy.name,
      email: createdBy.email,
    },
    updatedBy: updatedBy
      ? {
          id: updatedBy.id,
          name: updatedBy.name,
          email: updatedBy.email,
        }
      : null,
  };
}

export const demoStore = {
  company,
  users,

  findUserByEmail(email: string) {
    return users.find((user) => user.email === email && user.active);
  },

  findUserById(userId: string) {
    return users.find((user) => user.id === userId && user.active);
  },

  listUsers(auth: AuthContext) {
    return users
      .filter((user) => user.companyId === auth.companyId && user.active)
      .filter((user) => isWorkspaceAdmin(auth.role) || user.id === auth.userId)
      .map((user) => ({
        id: user.id,
        membershipId: `demo-membership-${user.id}`,
        name: user.name,
        email: user.email,
        role: user.role,
        color: user.color,
        timezone: user.timezone,
      }));
  },

  listSchedules(auth: AuthContext) {
    return getAccessibleSchedules(auth).map(toScheduleResponse);
  },

  getSchedule(auth: AuthContext, scheduleId: string) {
    const schedule = getAccessibleSchedules(auth).find((item) => item.id === scheduleId);
    if (!schedule) {
      throw new AppError("Agenda não encontrada.", 404);
    }
    return toScheduleResponse(schedule);
  },

  createSchedule(auth: AuthContext, payload: {
    name: string;
    description?: string | null;
    active: boolean;
    color: string;
    timezone: string;
    ownerId?: string;
    assignedUserIds: string[];
    workingHours: DemoWorkingHour[];
  }) {
    const ownerId = isWorkspaceAdmin(auth.role) ? payload.ownerId ?? auth.userId : auth.userId;
    const schedule: DemoSchedule = {
      id: nextId("schedule"),
      companyId: auth.companyId,
      ownerId,
      name: payload.name,
      description: payload.description ?? null,
      active: payload.active,
      color: payload.color,
      timezone: payload.timezone,
      assignmentUserIds: Array.from(new Set([ownerId, ...payload.assignedUserIds])),
      workingHours: payload.workingHours.map((item) => ({
        ...item,
        id: nextId("wh"),
      })),
      googleCalendarIntegration: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    schedules.push(schedule);
    return toScheduleResponse(schedule);
  },

  updateSchedule(auth: AuthContext, scheduleId: string, payload: Partial<DemoSchedule> & { assignedUserIds?: string[]; workingHours?: DemoWorkingHour[] }) {
    const schedule = getAccessibleSchedules(auth).find((item) => item.id === scheduleId);
    if (!schedule) {
      throw new AppError("Agenda não encontrada.", 404);
    }

    schedule.name = payload.name ?? schedule.name;
    schedule.description = payload.description === undefined ? schedule.description : payload.description;
    schedule.active = payload.active ?? schedule.active;
    schedule.color = payload.color ?? schedule.color;
    schedule.timezone = payload.timezone ?? schedule.timezone;
    if (payload.assignedUserIds && isWorkspaceAdmin(auth.role)) {
      schedule.assignmentUserIds = Array.from(new Set([payload.ownerId ?? schedule.ownerId, ...payload.assignedUserIds]));
    }
    schedule.ownerId = isWorkspaceAdmin(auth.role) ? payload.ownerId ?? schedule.ownerId : schedule.ownerId;
    if (payload.workingHours) {
      schedule.workingHours = payload.workingHours.map((item) => ({ ...item, id: item.id || nextId("wh") }));
    }
    schedule.updatedAt = new Date();
    return toScheduleResponse(schedule);
  },

  deleteSchedule(auth: AuthContext, scheduleId: string) {
    const index = schedules.findIndex((item) => item.id === scheduleId && getAccessibleSchedules(auth).some((accessible) => accessible.id === item.id));
    if (index === -1) {
      throw new AppError("Agenda não encontrada.", 404);
    }
    schedules.splice(index, 1);
    for (let i = appointments.length - 1; i >= 0; i -= 1) {
      const appointment = appointments[i];
      if (appointment && appointment.scheduleId === scheduleId) {
        appointments.splice(i, 1);
      }
    }
    return { success: true };
  },

  listAppointments(auth: AuthContext, filters: {
    scheduleId?: string;
    status?: AppointmentStatus;
    search?: string;
    startDate?: string;
    endDate?: string;
    page: number;
    pageSize: number;
  }) {
    const allowedScheduleIds = getAccessibleSchedules(auth).map((item) => item.id);
    const filtered = appointments
      .filter((item) => item.companyId === auth.companyId && allowedScheduleIds.includes(item.scheduleId))
      .filter((item) => !filters.scheduleId || item.scheduleId === filters.scheduleId)
      .filter((item) => !filters.status || item.status === filters.status)
      .filter((item) => {
        if (!filters.search) return true;
        const value = filters.search.toLowerCase();
        return [item.title, item.description, item.customerName, item.customerEmail].filter(Boolean).some((field) => String(field).toLowerCase().includes(value));
      })
      .filter((item) => !filters.startDate || item.startAt >= dayjs(filters.startDate).startOf("day").toDate())
      .filter((item) => !filters.endDate || item.startAt <= dayjs(filters.endDate).endOf("day").toDate())
      .sort((a, b) => a.startAt.getTime() - b.startAt.getTime());

    const pageItems = filtered.slice((filters.page - 1) * filters.pageSize, filters.page * filters.pageSize).map(toAppointmentResponse);
    const stats = {
      total: filtered.length,
      scheduled: filtered.filter((item) => item.status === AppointmentStatus.SCHEDULED).length,
      confirmed: filtered.filter((item) => item.status === AppointmentStatus.CONFIRMED).length,
      completed: filtered.filter((item) => item.status === AppointmentStatus.COMPLETED).length,
      cancelled: filtered.filter((item) => item.status === AppointmentStatus.CANCELLED).length,
      noShow: filtered.filter((item) => item.status === AppointmentStatus.NO_SHOW).length,
    };

    return {
      appointments: pageItems,
      stats,
      meta: {
        page: filters.page,
        pageSize: filters.pageSize,
        total: filtered.length,
      },
    };
  },

  getAppointment(auth: AuthContext, appointmentId: string) {
    const appointment = this.listAppointments(auth, { page: 1, pageSize: 1000 }).appointments.find((item) => item.id === appointmentId);
    if (!appointment) {
      throw new AppError("Compromisso não encontrado.", 404);
    }
    return appointment;
  },

  summary(auth: AuthContext, filters: { scheduleId?: string; status?: AppointmentStatus; search?: string; startDate?: string; endDate?: string; page: number; pageSize: number }) {
    const result = this.listAppointments(auth, filters);
    const visibleSchedules = getAccessibleSchedules(auth);
    const nextAppointment = result.appointments.find((item) => new Date(item.startAt) > new Date() && item.status !== AppointmentStatus.CANCELLED) ?? null;
    const today = dayjs();

    return {
      schedulesCount: visibleSchedules.filter((item) => item.active).length,
      linkedSchedulesCount: visibleSchedules.filter((item) => item.googleCalendarIntegration?.active).length,
      todayCount: result.appointments.filter((item) => dayjs(item.startAt).isSame(today, "day")).length,
      nextAppointment,
    };
  },

  createAppointment(auth: AuthContext, payload: Omit<DemoAppointment, "id" | "companyId" | "createdAt" | "updatedAt" | "createdById" | "updatedById" | "externalEventId" | "externalProvider">) {
    const appointment: DemoAppointment = {
      id: nextId("appointment"),
      companyId: auth.companyId,
      externalEventId: null,
      externalProvider: null,
      createdById: auth.userId,
      updatedById: auth.userId,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...payload,
    };
    appointments.push(appointment);
    return toAppointmentResponse(appointment);
  },

  updateAppointment(auth: AuthContext, appointmentId: string, payload: Partial<DemoAppointment>) {
    const appointment = appointments.find((item) => item.id === appointmentId && item.companyId === auth.companyId);
    if (!appointment) {
      throw new AppError("Compromisso não encontrado.", 404);
    }
    Object.assign(appointment, payload, { updatedAt: new Date(), updatedById: auth.userId });
    return toAppointmentResponse(appointment);
  },

  deleteAppointment(auth: AuthContext, appointmentId: string) {
    const index = appointments.findIndex((item) => item.id === appointmentId && item.companyId === auth.companyId);
    if (index === -1) {
      throw new AppError("Compromisso não encontrado.", 404);
    }
    appointments.splice(index, 1);
    return { success: true };
  },
};
