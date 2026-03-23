import { AppointmentStatus, type Prisma } from "@prisma/client";

import { AppError } from "../../../../shared/errors/app-error.js";
import { dayjs } from "../../../../shared/lib/dayjs.js";

type WorkingHours = {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  breakStart: string | null;
  breakEnd: string | null;
  active: boolean;
};

type ScheduleWithWorkingHours = {
  id: string;
  name: string;
  active: boolean;
  timezone: string;
  workingHours: WorkingHours[];
};

type ExistingAppointment = {
  id: string;
  title: string;
  startAt: Date;
  endAt: Date;
  status: AppointmentStatus;
};

function timeToMinutes(value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  return (hours ?? 0) * 60 + (minutes ?? 0);
}

function intervalOverlaps(startA: number, endA: number, startB: number, endB: number) {
  return startA < endB && endA > startB;
}

export function assertScheduleAvailability(
  schedule: ScheduleWithWorkingHours,
  startAt: Date,
  endAt: Date,
  existingAppointments: ExistingAppointment[],
  appointmentId?: string,
) {
  if (!schedule.active) {
    throw new AppError("A agenda está inativa e não aceita novos compromissos.", 409);
  }

  const localStart = dayjs(startAt).tz(schedule.timezone);
  const localEnd = dayjs(endAt).tz(schedule.timezone);
  const workingSlot = schedule.workingHours.find((item) => item.dayOfWeek === localStart.day() && item.active);

  if (!workingSlot) {
    throw new AppError("A agenda não possui expediente configurado para este dia.", 422);
  }

  const appointmentStartMinutes = localStart.hour() * 60 + localStart.minute();
  const appointmentEndMinutes = localEnd.hour() * 60 + localEnd.minute();
  const workingStart = timeToMinutes(workingSlot.startTime);
  const workingEnd = timeToMinutes(workingSlot.endTime);

  if (appointmentStartMinutes < workingStart || appointmentEndMinutes > workingEnd) {
    throw new AppError(
      `O compromisso precisa estar dentro do expediente (${workingSlot.startTime} às ${workingSlot.endTime}).`,
      422,
    );
  }

  if (workingSlot.breakStart && workingSlot.breakEnd) {
    const breakStart = timeToMinutes(workingSlot.breakStart);
    const breakEnd = timeToMinutes(workingSlot.breakEnd);
    if (intervalOverlaps(appointmentStartMinutes, appointmentEndMinutes, breakStart, breakEnd)) {
      throw new AppError(
        `O horário conflita com a pausa configurada (${workingSlot.breakStart} às ${workingSlot.breakEnd}).`,
        422,
      );
    }
  }

  const conflicting = existingAppointments.find((item) => {
    if (appointmentId && item.id === appointmentId) {
      return false;
    }

    if (item.status === AppointmentStatus.CANCELLED || item.status === AppointmentStatus.NO_SHOW) {
      return false;
    }

    return startAt < item.endAt && endAt > item.startAt;
  });

  if (conflicting) {
    throw new AppError(`Conflito de horário com "${conflicting.title}".`, 409);
  }
}

export function buildAppointmentWindow({
  startAt,
  endAt,
  durationMinutes,
}: {
  startAt: string;
  endAt?: string;
  durationMinutes: number;
}) {
  const start = new Date(startAt);
  const end = endAt ? new Date(endAt) : dayjs(start).add(durationMinutes, "minute").toDate();

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    throw new AppError("Datas inválidas para o compromisso.", 422);
  }

  if (end <= start) {
    throw new AppError("O término precisa ser maior que o início.", 422);
  }

  return {
    start,
    end,
    durationMinutes: Math.max(1, dayjs(end).diff(start, "minute")),
  };
}

export function buildAppointmentWhere({
  companyId,
  scheduleIds,
  filters,
}: {
  companyId: string;
  scheduleIds?: string[];
  filters: {
    scheduleId?: string;
    status?: AppointmentStatus;
    search?: string;
    startDate?: string;
    endDate?: string;
  };
}): Prisma.AppointmentWhereInput {
  return {
    companyId,
    ...(scheduleIds ? { scheduleId: { in: scheduleIds } } : {}),
    ...(filters.scheduleId ? { scheduleId: filters.scheduleId } : {}),
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.search
      ? {
          OR: [
            { title: { contains: filters.search, mode: "insensitive" } },
            { description: { contains: filters.search, mode: "insensitive" } },
            { customerName: { contains: filters.search, mode: "insensitive" } },
            { customerEmail: { contains: filters.search, mode: "insensitive" } },
          ],
        }
      : {}),
    ...(filters.startDate || filters.endDate
      ? {
          startAt: {
            ...(filters.startDate ? { gte: dayjs(filters.startDate).startOf("day").toDate() } : {}),
            ...(filters.endDate ? { lte: dayjs(filters.endDate).endOf("day").toDate() } : {}),
          },
        }
      : {}),
  };
}
