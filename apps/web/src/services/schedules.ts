import { api } from "../lib/api";
import type { Schedule, UserOption, WorkingHour } from "../types";

export type SchedulePayload = {
  name: string;
  description?: string | null;
  active: boolean;
  color: string;
  timezone: string;
  ownerId?: string;
  assignedUserIds: string[];
  workingHours: WorkingHour[];
};

export async function fetchSchedules(params?: Record<string, string | boolean | undefined>) {
  const { data } = await api.get<{ schedules: Schedule[] }>("/schedules", { params });
  return data;
}

export async function createSchedule(payload: SchedulePayload) {
  const { data } = await api.post<Schedule>("/schedules", payload);
  return data;
}

export async function updateSchedule(scheduleId: string, payload: Partial<SchedulePayload>) {
  const { data } = await api.put<Schedule>(`/schedules/${scheduleId}`, payload);
  return data;
}

export async function deleteSchedule(scheduleId: string) {
  const { data } = await api.delete<{ success: boolean }>(`/schedules/${scheduleId}`);
  return data;
}

export async function disconnectGoogleCalendar(scheduleId: string) {
  const { data } = await api.delete<{ success: boolean }>(`/schedules/${scheduleId}/google`);
  return data;
}

export async function getGoogleCalendarAuthUrl(scheduleId: string) {
  const { data } = await api.get<{ url: string }>("/google-calendar/auth-url", {
    params: { scheduleId },
  });
  return data;
}

export async function fetchAssignableUsers() {
  const { data } = await api.get<{ users: UserOption[] }>("/users");
  return data;
}
