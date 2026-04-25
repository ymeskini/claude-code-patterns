import { describe, it, expect } from "vitest";
import {
  getStartDateForPeriod,
  isAdminAnalyticsPeriod,
} from "./admin-analytics";

describe("admin-analytics", () => {
  describe("isAdminAnalyticsPeriod", () => {
    it("accepts known periods", () => {
      expect(isAdminAnalyticsPeriod("7d")).toBe(true);
      expect(isAdminAnalyticsPeriod("30d")).toBe(true);
      expect(isAdminAnalyticsPeriod("12m")).toBe(true);
      expect(isAdminAnalyticsPeriod("all")).toBe(true);
    });

    it("rejects unknown periods", () => {
      expect(isAdminAnalyticsPeriod("today")).toBe(false);
      expect(isAdminAnalyticsPeriod("")).toBe(false);
    });
  });

  describe("getStartDateForPeriod", () => {
    const now = new Date("2026-04-25T12:00:00.000Z");

    it("returns 7 days ago for 7d", () => {
      expect(getStartDateForPeriod({ period: "7d", now })).toBe(
        "2026-04-18T12:00:00.000Z"
      );
    });

    it("returns 30 days ago for 30d", () => {
      expect(getStartDateForPeriod({ period: "30d", now })).toBe(
        "2026-03-26T12:00:00.000Z"
      );
    });

    it("returns 12 months ago for 12m", () => {
      expect(getStartDateForPeriod({ period: "12m", now })).toBe(
        "2025-04-25T12:00:00.000Z"
      );
    });

    it("returns null for all", () => {
      expect(getStartDateForPeriod({ period: "all", now })).toBeNull();
    });
  });
});
