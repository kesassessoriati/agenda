import { api } from "../lib/api";
import type { Appointment, AppointmentListResponse, AppointmentSummary, AppointmentStatus } from "../types";

export type AppointmentPayload = {
  scheduleId: string;
  title: string;
  description?: string | null;
  startAt: string;
  endAt?: string;
  durationMinutes: number;
  status: AppointmentStatus;
  serviceName?: string | null;
  customerName?: string | null;
  customerEmail?: string | null;
  organizerEmail?: string | null;
  participantEmails: string[];
  meetingLink?: string | null;
  notes?: string | null;
};

export async function fetchAppointments(params: Record<string, string | number | undefined>) {
  const { data } = await api.get<AppointmentListResponse>("/appointments", { params });
  return data;
}

export async function fetchAppointmentSummary(params: Record<string, string | number | undefined>) {
  const { data } = await api.get<AppointmentSummary>("/appointments/summary", { params });
  return data;
}

export async function createAppointment(payload: AppointmentPayload) {
  const { data } = await api.post<Appointment>("/appointments", payload);
  return data;
}

export async function updateAppointment(appointmentId: string, payload: Partial<AppointmentPayload>) {
  const { data } = await api.put<Appointment>(`/appointments/${appointmentId}`, payload);
  return data;
}

export async function deleteAppointment(appointmentId: string) {
  const { data } = await api.delete<{ success: boolean }>(`/appointments/${appointmentId}`);
  return data;
}

export async function syncGoogleAppointments(scheduleId?: string) {
  const { data } = await api.post<{
    imported: number;
    updated: number;
    skipped: number;
    errors: string[];
  }>("/appointments/sync-google", { scheduleId });
  return data;
}
