export type PlatformRole = "USER" | "SUPERADMIN";
export type WorkspaceRole = "OWNER" | "ADMIN" | "MEMBER";
export type InvitationStatus = "PENDING" | "ACCEPTED" | "REVOKED" | "EXPIRED";
export type AppointmentStatus = "SCHEDULED" | "CONFIRMED" | "COMPLETED" | "CANCELLED" | "NO_SHOW";
export type CompanyPlan = "FREE" | "BASIC" | "PREMIUM" | "UNLIMITED";

export interface CompanySummary {
  id: string;
  name: string;
  slug: string;
  timezone: string;
  plan: CompanyPlan;
  planExpiresAt?: string | null;
}

export interface WorkspaceMembershipSummary {
  id: string;
  companyId: string;
  role: WorkspaceRole;
  joinedAt: string;
  lastAccessedAt?: string | null;
  company: CompanySummary;
}

export interface AuthUser {
  id: string;
  membershipId: string;
  companyId: string;
  name: string;
  email: string;
  color?: string | null;
  platformRole: PlatformRole;
  role: WorkspaceRole;
  timezone: string;
  company: CompanySummary;
  memberships: WorkspaceMembershipSummary[];
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
  membershipId: string;
  name: string;
  email: string;
  role: WorkspaceRole;
  color?: string | null;
  timezone: string;
}

export interface TeamMember {
  id: string;
  companyId: string;
  role: WorkspaceRole;
  active: boolean;
  joinedAt: string;
  lastAccessedAt?: string | null;
  user: {
    id: string;
    name: string;
    email: string;
    color?: string | null;
    timezone: string;
    active: boolean;
  };
}

export interface Invitation {
  id: string;
  email: string;
  role: WorkspaceRole;
  status: InvitationStatus;
  expiresAt: string;
  acceptedAt?: string | null;
  revokedAt?: string | null;
  createdAt: string;
  invitedBy: {
    id: string;
    name: string;
    email: string;
  };
  acceptedByUser?: {
    id: string;
    name: string;
    email: string;
  } | null;
}

export interface InvitationPreview {
  company: CompanySummary;
  email: string;
  role: WorkspaceRole;
  status: InvitationStatus;
  expiresAt: string;
  inviter: {
    id: string;
    name: string;
    email: string;
  };
  existingUser: boolean;
}

export interface PlatformCompanyOverview {
  id: string;
  name: string;
  slug: string;
  timezone: string;
  plan: CompanyPlan;
  planExpiresAt?: string | null;
  createdAt: string;
  updatedAt: string;
  metrics: {
    memberships: number;
    activeMemberships: number;
    owners: number;
    admins: number;
    schedules: number;
    appointments: number;
    invitations: number;
  };
  owners: Array<{
    id: string;
    name: string;
    email: string;
  }>;
}

export interface PlatformCompanyDetail extends PlatformCompanyOverview {
  members: Array<{
    id: string;
    role: WorkspaceRole;
    active: boolean;
    joinedAt: string;
    lastAccessedAt?: string | null;
    user: {
      id: string;
      name: string;
      email: string;
      active: boolean;
      platformRole: PlatformRole;
    };
  }>;
  invitations: Array<{
    id: string;
    email: string;
    role: WorkspaceRole;
    acceptedAt?: string | null;
    revokedAt?: string | null;
    expiresAt: string;
    createdAt: string;
  }>;
}
