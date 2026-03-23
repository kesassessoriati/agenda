import { google } from "googleapis";
import jwt from "jsonwebtoken";

import { isWorkspaceAdmin, type AuthContext } from "../../../../shared/auth/context.js";
import { env, googleCalendarEnabled } from "../../../../shared/config/env.js";
import { AppError } from "../../../../shared/errors/app-error.js";
import { logger } from "../../../../shared/lib/logger.js";
import { prisma } from "../../../../shared/lib/prisma.js";

type StatePayload = {
  scheduleId: string;
  companyId: string;
  userId: string;
};

export type CalendarEventPayload = {
  title: string;
  description?: string | null;
  startAt: Date;
  endAt: Date;
  attendeeEmails: string[];
  existingMeetingLink?: string | null;
  status?: "confirmed" | "cancelled";
};

function ensureGoogleCalendarEnabled() {
  if (!googleCalendarEnabled) {
    throw new AppError("Google Calendar não está configurado neste ambiente.", 503);
  }
}

function createOAuthClient() {
  ensureGoogleCalendarEnabled();
  return new google.auth.OAuth2(env.GOOGLE_CLIENT_ID, env.GOOGLE_CLIENT_SECRET, env.GOOGLE_REDIRECT_URI);
}

async function ensureScheduleAccess(auth: AuthContext, scheduleId: string) {
  const schedule = await prisma.schedule.findFirst({
    where: {
      id: scheduleId,
      companyId: auth.companyId,
      ...(isWorkspaceAdmin(auth.role)
        ? {}
        : {
            assignments: {
              some: {
                userId: auth.userId,
              },
            },
          }),
    },
  });

  if (!schedule) {
    throw new AppError("Agenda não encontrada para integração.", 404);
  }

  return schedule;
}

export async function getGoogleCalendarAuthUrl(auth: AuthContext, scheduleId: string) {
  await ensureScheduleAccess(auth, scheduleId);
  const oauth2Client = createOAuthClient();
  const state = jwt.sign(
    { scheduleId, companyId: auth.companyId, userId: auth.userId } satisfies StatePayload,
    env.JWT_SECRET,
    { expiresIn: "10m" },
  );

  return oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: [
      "https://www.googleapis.com/auth/calendar",
      "https://www.googleapis.com/auth/calendar.events",
      "https://www.googleapis.com/auth/userinfo.email",
    ],
    state,
  });
}

export async function handleGoogleCalendarCallback(code: string, state: string) {
  const payload = jwt.verify(state, env.JWT_SECRET) as StatePayload;
  const oauth2Client = createOAuthClient();
  const tokens = await oauth2Client.getToken(code);

  oauth2Client.setCredentials(tokens.tokens);

  const oauth2 = google.oauth2({ version: "v2", auth: oauth2Client });
  const profile = await oauth2.userinfo.get();
  const email = profile.data.email;

  if (!email || !tokens.tokens.access_token) {
    throw new AppError("Não foi possível concluir a autenticação com o Google.", 422);
  }

  await prisma.googleCalendarIntegration.upsert({
    where: { scheduleId: payload.scheduleId },
    update: {
      companyId: payload.companyId,
      email,
      accessToken: tokens.tokens.access_token,
      refreshToken: tokens.tokens.refresh_token ?? undefined,
      tokenExpiry: tokens.tokens.expiry_date ? new Date(tokens.tokens.expiry_date) : null,
      active: true,
    },
    create: {
      companyId: payload.companyId,
      scheduleId: payload.scheduleId,
      email,
      calendarId: "primary",
      accessToken: tokens.tokens.access_token,
      refreshToken: tokens.tokens.refresh_token ?? null,
      tokenExpiry: tokens.tokens.expiry_date ? new Date(tokens.tokens.expiry_date) : null,
    },
  });

  return `${env.WEB_URL}/integrations/google-calendar/callback?status=success&scheduleId=${payload.scheduleId}`;
}

async function getCalendarClient(scheduleId: string, companyId: string) {
  const integration = await prisma.googleCalendarIntegration.findFirst({
    where: {
      companyId,
      scheduleId,
      active: true,
    },
  });

  if (!integration) {
    return null;
  }

  const oauth2Client = createOAuthClient();
  oauth2Client.setCredentials({
    access_token: integration.accessToken,
    refresh_token: integration.refreshToken ?? undefined,
    expiry_date: integration.tokenExpiry?.getTime(),
  });

  oauth2Client.on("tokens", async (tokens) => {
    if (tokens.access_token || tokens.refresh_token || tokens.expiry_date) {
      await prisma.googleCalendarIntegration.update({
        where: { id: integration.id },
        data: {
          accessToken: tokens.access_token ?? integration.accessToken,
          refreshToken: tokens.refresh_token ?? integration.refreshToken,
          tokenExpiry: tokens.expiry_date ? new Date(tokens.expiry_date) : integration.tokenExpiry,
        },
      });
    }
  });

  return {
    calendar: google.calendar({ version: "v3", auth: oauth2Client }),
    integration,
  };
}

export async function createGoogleCalendarEvent(scheduleId: string, companyId: string, event: CalendarEventPayload) {
  const client = await getCalendarClient(scheduleId, companyId);
  if (!client) {
    return null;
  }

  const response = await client.calendar.events.insert({
    calendarId: client.integration.calendarId,
    conferenceDataVersion: 1,
    requestBody: {
      summary: event.title,
      description: event.description ?? undefined,
      status: event.status,
      start: { dateTime: event.startAt.toISOString() },
      end: { dateTime: event.endAt.toISOString() },
      attendees: event.attendeeEmails.map((email) => ({ email })),
      conferenceData: event.existingMeetingLink
        ? undefined
        : {
            createRequest: {
              requestId: `kes-${Date.now()}`,
              conferenceSolutionKey: { type: "hangoutsMeet" },
            },
          },
    },
  });

  return {
    externalEventId: response.data.id ?? null,
    meetingLink:
      response.data.hangoutLink ??
      response.data.conferenceData?.entryPoints?.find((entry) => entry.entryPointType === "video")?.uri ??
      null,
    organizerEmail: response.data.organizer?.email ?? null,
    participantEmails: response.data.attendees?.map((item) => item.email).filter(Boolean) as string[] | undefined,
  };
}

export async function updateGoogleCalendarEvent(
  scheduleId: string,
  companyId: string,
  externalEventId: string,
  event: CalendarEventPayload,
) {
  const client = await getCalendarClient(scheduleId, companyId);
  if (!client) {
    return null;
  }

  const response = await client.calendar.events.patch({
    calendarId: client.integration.calendarId,
    eventId: externalEventId,
    requestBody: {
      summary: event.title,
      description: event.description ?? undefined,
      status: event.status,
      start: { dateTime: event.startAt.toISOString() },
      end: { dateTime: event.endAt.toISOString() },
      attendees: event.attendeeEmails.map((email) => ({ email })),
    },
  });

  return {
    meetingLink:
      response.data.hangoutLink ??
      response.data.conferenceData?.entryPoints?.find((entry) => entry.entryPointType === "video")?.uri ??
      null,
    organizerEmail: response.data.organizer?.email ?? null,
    participantEmails: response.data.attendees?.map((item) => item.email).filter(Boolean) as string[] | undefined,
  };
}

export async function deleteGoogleCalendarEvent(scheduleId: string, companyId: string, externalEventId: string) {
  const client = await getCalendarClient(scheduleId, companyId);
  if (!client) {
    return;
  }

  await client.calendar.events.delete({
    calendarId: client.integration.calendarId,
    eventId: externalEventId,
  });
}

export async function syncGoogleCalendar(scheduleIds: string[], companyId: string) {
  const linkedSchedules = await prisma.schedule.findMany({
    where: {
      companyId,
      id: { in: scheduleIds },
      googleCalendarIntegration: {
        is: { active: true },
      },
    },
    include: {
      googleCalendarIntegration: true,
    },
  });

  const result = { imported: 0, updated: 0, skipped: 0, errors: [] as string[] };

  for (const schedule of linkedSchedules) {
    try {
      const client = await getCalendarClient(schedule.id, companyId);
      if (!client) {
        result.skipped += 1;
        continue;
      }

      const response = await client.calendar.events.list({
        calendarId: client.integration.calendarId,
        singleEvents: true,
        maxResults: 250,
        orderBy: "startTime",
        timeMin: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      });

      for (const event of response.data.items ?? []) {
        if (!event.start?.dateTime || !event.id) {
          result.skipped += 1;
          continue;
        }

        const startAt = new Date(event.start.dateTime);
        const endAt = new Date(event.end?.dateTime ?? startAt);
        const durationMinutes = Math.max(1, Math.round((endAt.getTime() - startAt.getTime()) / 60000));

        const existing = await prisma.appointment.findFirst({
          where: {
            companyId,
            scheduleId: schedule.id,
            externalEventId: event.id,
          },
        });

        if (!existing) {
          await prisma.appointment.create({
            data: {
              companyId,
              scheduleId: schedule.id,
              title: event.summary?.trim() || "(Sem título)",
              description: event.description ?? null,
              startAt,
              endAt,
              durationMinutes,
              status: event.status === "cancelled" ? "CANCELLED" : "SCHEDULED",
              organizerEmail: event.organizer?.email ?? null,
              participantEmails: event.attendees?.map((item) => item.email).filter(Boolean) as string[] | undefined,
              meetingLink:
                event.hangoutLink ??
                event.conferenceData?.entryPoints?.find((entry) => entry.entryPointType === "video")?.uri ??
                null,
              externalEventId: event.id,
              externalProvider: "google_calendar",
              createdById: schedule.ownerId,
              updatedById: schedule.ownerId,
            },
          });
          result.imported += 1;
          continue;
        }

        await prisma.appointment.update({
          where: { id: existing.id },
          data: {
            title: event.summary?.trim() || existing.title,
            description: event.description ?? existing.description,
            startAt,
            endAt,
            durationMinutes,
            status: event.status === "cancelled" ? "CANCELLED" : existing.status,
            organizerEmail: event.organizer?.email ?? existing.organizerEmail,
            participantEmails:
              (event.attendees?.map((item) => item.email).filter(Boolean) as string[] | undefined) ?? existing.participantEmails,
            meetingLink:
              event.hangoutLink ??
              event.conferenceData?.entryPoints?.find((entry) => entry.entryPointType === "video")?.uri ??
              existing.meetingLink,
          },
        });
        result.updated += 1;
      }

      await prisma.googleCalendarIntegration.update({
        where: { id: schedule.googleCalendarIntegration!.id },
        data: { lastSyncedAt: new Date() },
      });
    } catch (error) {
      logger.error({ error, scheduleId: schedule.id }, "Failed to sync Google Calendar");
      result.errors.push(`Falha ao sincronizar agenda ${schedule.name}.`);
    }
  }

  return result;
}
