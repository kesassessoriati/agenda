import dayjs from "dayjs";
import "dayjs/locale/pt-br";

import type { AppointmentStatus, WorkingHour } from "../types";

dayjs.locale("pt-br");

export const weekDayLabels = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"];

export function formatDateTime(value?: string | Date | null) {
  if (!value) {
    return "-";
  }

  return dayjs(value).format("DD/MM/YYYY HH:mm");
}

export function formatDateInput(value?: string | Date | null) {
  if (!value) {
    return "";
  }

  return dayjs(value).format("YYYY-MM-DD");
}

export function formatDateTimeInput(value?: string | Date | null) {
  if (!value) {
    return "";
  }

  return dayjs(value).format("YYYY-MM-DDTHH:mm");
}

export function formatDuration(minutes: number) {
  if (minutes < 60) {
    return `${minutes} min`;
  }

  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  return remaining ? `${hours}h ${remaining}min` : `${hours}h`;
}

export function statusLabel(status: AppointmentStatus) {
  return {
    SCHEDULED: "Agendado",
    CONFIRMED: "Confirmado",
    COMPLETED: "Concluído",
    CANCELLED: "Cancelado",
    NO_SHOW: "Não compareceu",
  }[status];
}

export function statusColor(status: AppointmentStatus) {
  return {
    SCHEDULED: "#2563eb",
    CONFIRMED: "#059669",
    COMPLETED: "#475569",
    CANCELLED: "#dc2626",
    NO_SHOW: "#d97706",
  }[status];
}

export function buildDefaultWorkingHours(): WorkingHour[] {
  return [1, 2, 3, 4, 5].map((dayOfWeek) => ({
    dayOfWeek,
    startTime: "09:00",
    endTime: "18:00",
    breakStart: "12:00",
    breakEnd: "13:00",
    active: true,
  }));
}

export function serializeParticipantEmails(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function formatWorkingHoursSummary(hours: WorkingHour[]) {
  return hours
    .filter((item) => item.active)
    .map((item) => `${weekDayLabels[item.dayOfWeek]} ${item.startTime}-${item.endTime}`)
    .join(" • ");
}
