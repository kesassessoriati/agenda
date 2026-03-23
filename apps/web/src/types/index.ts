export type UserRole = "ADMIN" | "MEMBER";
export type AppointmentStatus = "SCHEDULED" | "CONFIRMED" | "COMPLETED" | "CANCELLED" | "NO_SHOW";

export interface CompanySummary {
  id: string;
  name: string;
  slug: string;
}

export interface AuthUser {
  id: string;
  companyId: string;
  name: string;
  email: string;
  role: UserRole;
  timezone: string;
  company: CompanySummary;
}

export interface WorkingHour {
  id?: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  breakStart?: string | null;
  breakEnd?: string | null;
  active: boolean;
}

export interface ScheduleAssignment {
  id: string;
  role: "OWNER" | "EDITOR" | "VIEWER";
  user: {
    id: string;
    name: string;
    email: string;
    role: UserRole;
    color?: string | null;
  };
}

export interface GoogleCalendarIntegration {
  id: string;
  email: string;
  calendarId: string;
  active: boolean;
  lastSyncedAt?: string | null;
  createdAt: string;
}

export interface Schedule {
  id: string;
  companyId: string;
  ownerId: string;
  name: string;
  description?: string | null;
  active: boolean;
  color: string;
  timezone: string;
  owner: {
    id: string;
    name: string;
    email: string;
    role: UserRole;
  };
  assignments: ScheduleAssignment[];
  workingHours: WorkingHour[];
  googleCalendarIntegration?: GoogleCalendarIntegration | null;
  _count?: {
    appointments: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface Appointment {
  id: string;
  companyId: string;
  scheduleId: string;
  title: string;
  description?: string | null;
  startAt: string;
  endAt: string;
  durationMinutes: number;
  status: AppointmentStatus;
  serviceName?: string | null;
  customerName?: string | null;
  customerEmail?: string | null;
  organizerEmail?: string | null;
  participantEmails: string[];
  meetingLink?: string | null;
  externalEventId?: string | null;
  externalProvider?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  schedule: Schedule;
}

export interface AppointmentListResponse {
  appointments: Appointment[];
  stats: {
    total: number;
    scheduled: number;
    confirmed: number;
    completed: number;
    cancelled: number;
    noShow: number;
  };
  meta: {
    page: number;
    pageSize: number;
    total: number;
  };
}

export interface AppointmentSummary {
  schedulesCount: number;
  linkedSchedulesCount: number;
  todayCount: number;
  nextAppointment?: Appointment | null;
}

export interface UserOption {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  color?: string | null;
  timezone: string;
}
