import { AppointmentStatus } from "@prisma/client";
import { describe, expect, it } from "vitest";

import { assertScheduleAvailability, buildAppointmentWindow } from "./availability.service.js";

describe("availability.service", () => {
  const schedule = {
    id: "schedule-1",
    name: "Agenda Teste",
    active: true,
    timezone: "America/Sao_Paulo",
    workingHours: [
      {
        dayOfWeek: 1,
        startTime: "09:00",
        endTime: "18:00",
        breakStart: "12:00",
        breakEnd: "13:00",
        active: true,
      },
    ],
  };

  it("builds the appointment window from duration", () => {
    const window = buildAppointmentWindow({
      startAt: "2026-03-16T10:00:00.000Z",
      durationMinutes: 90,
    });

    expect(window.durationMinutes).toBe(90);
    expect(window.end.toISOString()).toBe("2026-03-16T11:30:00.000Z");
  });

  it("blocks appointments that overlap the break window", () => {
    expect(() =>
      assertScheduleAvailability(
        schedule,
        new Date("2026-03-16T15:30:00.000Z"),
        new Date("2026-03-16T16:30:00.000Z"),
        [],
      ),
    ).toThrow(/pausa configurada/i);
  });

  it("blocks conflicts with another active appointment", () => {
    expect(() =>
      assertScheduleAvailability(
        schedule,
        new Date("2026-03-16T13:30:00.000Z"),
        new Date("2026-03-16T14:30:00.000Z"),
        [
          {
            id: "a1",
            title: "Outro compromisso",
            startAt: new Date("2026-03-16T14:00:00.000Z"),
            endAt: new Date("2026-03-16T15:00:00.000Z"),
            status: AppointmentStatus.SCHEDULED,
          },
        ],
      ),
    ).toThrow(/conflito/i);
  });
});
