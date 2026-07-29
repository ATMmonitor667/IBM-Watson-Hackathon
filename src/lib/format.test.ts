import { describe, expect, it } from "vitest";

import { relativeTime, sceneLabel, shortDate } from "@/lib/format";

const NOW = new Date("2026-07-28T12:00:00.000Z").getTime();

describe("relativeTime", () => {
  it("describes recent instants", () => {
    expect(relativeTime("2026-07-28T11:59:40.000Z", NOW)).toBe("just now");
    expect(relativeTime("2026-07-28T11:48:00.000Z", NOW)).toBe(
      "12 minutes ago",
    );
    expect(relativeTime("2026-07-28T09:00:00.000Z", NOW)).toBe("3 hours ago");
    expect(relativeTime("2026-07-27T12:00:00.000Z", NOW)).toBe("yesterday");
  });

  it("falls back to an absolute date beyond a week", () => {
    expect(relativeTime("2026-07-01T12:00:00.000Z", NOW)).toBe("Jul 1");
  });

  it("returns an empty string for an unparseable value rather than NaN", () => {
    expect(relativeTime("not a date", NOW)).toBe("");
  });
});

describe("shortDate", () => {
  it("is stable regardless of when it is called", () => {
    // This is what makes it safe to render on the server and during hydration.
    expect(shortDate("2026-07-24T11:00:00.000Z")).toBe(
      shortDate("2026-07-24T11:00:00.000Z"),
    );
    expect(shortDate("2026-07-24T11:00:00.000Z")).toBe("Jul 24");
  });
});

describe("sceneLabel", () => {
  it("takes the short code off a scene title", () => {
    expect(sceneLabel("S4 — Reading the compass in the dark")).toBe("S4");
    expect(sceneLabel("S1 — Arrival at the waterline")).toBe("S1");
  });

  it("returns the whole title when there is no code", () => {
    expect(sceneLabel("An untitled scene")).toBe("An untitled scene");
  });
});
