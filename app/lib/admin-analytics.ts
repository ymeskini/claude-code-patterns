export type AdminAnalyticsPeriod = "7d" | "30d" | "12m" | "all";

export const ADMIN_ANALYTICS_PERIODS: readonly AdminAnalyticsPeriod[] = [
  "7d",
  "30d",
  "12m",
  "all",
] as const;

export function isAdminAnalyticsPeriod(
  value: string
): value is AdminAnalyticsPeriod {
  return (ADMIN_ANALYTICS_PERIODS as readonly string[]).includes(value);
}

export function getStartDateForPeriod(opts: {
  period: AdminAnalyticsPeriod;
  now?: Date;
}): string | null {
  const now = opts.now ?? new Date();
  switch (opts.period) {
    case "7d": {
      const d = new Date(now);
      d.setUTCDate(d.getUTCDate() - 7);
      return d.toISOString();
    }
    case "30d": {
      const d = new Date(now);
      d.setUTCDate(d.getUTCDate() - 30);
      return d.toISOString();
    }
    case "12m": {
      const d = new Date(now);
      d.setUTCMonth(d.getUTCMonth() - 12);
      return d.toISOString();
    }
    case "all":
      return null;
  }
}
