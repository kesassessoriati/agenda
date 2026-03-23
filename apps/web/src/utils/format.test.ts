import { describe, expect, it } from "vitest";

import { formatDuration, serializeParticipantEmails, statusLabel } from "./format";

describe("format utils", () => {
  it("formats longer durations", () => {
    expect(formatDuration(90)).toBe("1h 30min");
  });

  it("maps appointment status labels", () => {
    expect(statusLabel("NO_SHOW")).toBe("Não compareceu");
  });

  it("normalizes participant email input", () => {
    expect(serializeParticipantEmails(" a@x.com, b@y.com ,, ")).toEqual(["a@x.com", "b@y.com"]);
  });
});
