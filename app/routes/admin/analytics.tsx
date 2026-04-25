import { useNavigate, useNavigation } from "react-router";
import { data, isRouteErrorResponse, Link } from "react-router";
import type { Route } from "./+types/analytics";
import { getCurrentUserId } from "~/server/lib/session";
import { getUserById } from "~/server/services/userService";
import { UserRole } from "~/server/db/schema";
import {
  ADMIN_ANALYTICS_PERIODS,
  getStartDateForPeriod,
  getTopEarningCourse,
  getTotalEnrollments,
  getTotalRevenue,
  isAdminAnalyticsPeriod,
  type AdminAnalyticsPeriod,
} from "~/server/services/adminAnalyticsService";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Skeleton } from "~/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { formatPrice } from "~/lib/utils";
import {
  AlertTriangle,
  BarChart3,
  DollarSign,
  Trophy,
  Users,
} from "lucide-react";

const DEFAULT_PERIOD: AdminAnalyticsPeriod = "30d";

const PERIOD_LABELS: Record<AdminAnalyticsPeriod, string> = {
  "7d": "Last 7 days",
  "30d": "Last 30 days",
  "12m": "Last 12 months",
  all: "All time",
};

const TAB_LABELS: Record<AdminAnalyticsPeriod, string> = {
  "7d": "7d",
  "30d": "30d",
  "12m": "12m",
  all: "All",
};

export function meta() {
  return [
    { title: "Admin Analytics — Cadence" },
    { name: "description", content: "Platform-wide analytics dashboard" },
  ];
}

export async function loader({ request }: Route.LoaderArgs) {
  const currentUserId = await getCurrentUserId(request);

  if (!currentUserId) {
    throw data("Select a user from the DevUI panel to view analytics.", {
      status: 401,
    });
  }

  const currentUser = getUserById(currentUserId);

  if (!currentUser || currentUser.role !== UserRole.Admin) {
    throw data("Only admins can access this page.", { status: 403 });
  }

  const url = new URL(request.url);
  const rawPeriod = url.searchParams.get("period");
  const period: AdminAnalyticsPeriod =
    rawPeriod && isAdminAnalyticsPeriod(rawPeriod) ? rawPeriod : DEFAULT_PERIOD;

  const startDate = getStartDateForPeriod({ period });

  const totalRevenue = getTotalRevenue({ startDate });
  const totalEnrollments = getTotalEnrollments({ startDate });
  const topCourse = getTopEarningCourse({ startDate });

  return {
    period,
    totalRevenue,
    totalEnrollments,
    topCourse,
  };
}

export function HydrateFallback() {
  return (
    <div className="mx-auto max-w-7xl p-6 lg:p-8">
      <div className="mb-8">
        <Skeleton className="h-9 w-56" />
        <Skeleton className="mt-2 h-5 w-80" />
      </div>
      <Skeleton className="mb-6 h-9 w-64" />
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-4 w-32" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-24" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  caption,
  icon,
}: {
  label: string;
  value: string;
  caption?: string;
  icon: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {label}
        </CardTitle>
        <span className="text-muted-foreground">{icon}</span>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold tracking-tight">{value}</div>
        {caption && (
          <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
            {caption}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export default function AdminAnalytics({ loaderData }: Route.ComponentProps) {
  const { period, totalRevenue, totalEnrollments, topCourse } = loaderData;
  const navigate = useNavigate();
  const navigation = useNavigation();
  const isLoading =
    navigation.state === "loading" &&
    navigation.location?.pathname === "/admin/analytics";

  const hasData =
    totalRevenue > 0 || totalEnrollments > 0 || topCourse !== null;

  function handlePeriodChange(next: string) {
    if (!isAdminAnalyticsPeriod(next)) return;
    const params = new URLSearchParams();
    if (next !== DEFAULT_PERIOD) params.set("period", next);
    const search = params.toString();
    navigate(search ? `/admin/analytics?${search}` : "/admin/analytics");
  }

  return (
    <div className="mx-auto max-w-7xl p-6 lg:p-8">
      <nav className="mb-6 text-sm text-muted-foreground">
        <Link to="/" className="hover:text-foreground">
          Home
        </Link>
        <span className="mx-2">/</span>
        <span className="text-foreground">Analytics</span>
      </nav>

      <div className="mb-8">
        <h1 className="text-3xl font-bold">Platform Analytics</h1>
        <p className="mt-1 text-muted-foreground">
          Revenue and enrollment performance across all instructors and courses
        </p>
      </div>

      <div className="mb-6 flex items-center justify-between gap-4">
        <Tabs value={period} onValueChange={handlePeriodChange}>
          <TabsList>
            {ADMIN_ANALYTICS_PERIODS.map((p) => (
              <TabsTrigger key={p} value={p}>
                {TAB_LABELS[p]}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <span className="text-xs text-muted-foreground">
          {PERIOD_LABELS[period]}
        </span>
      </div>

      {!hasData ? (
        <Card>
          <CardContent className="py-16 text-center">
            <BarChart3 className="mx-auto mb-3 size-10 text-muted-foreground/50" />
            <h2 className="text-lg font-medium">No data yet</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              No purchases or enrollments have been recorded for{" "}
              {PERIOD_LABELS[period].toLowerCase()}.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div
          className={`grid gap-6 sm:grid-cols-2 lg:grid-cols-3 ${
            isLoading ? "opacity-60" : ""
          }`}
        >
          <SummaryCard
            label="Total Revenue"
            value={formatPrice(totalRevenue)}
            caption={PERIOD_LABELS[period]}
            icon={<DollarSign className="size-4" />}
          />
          <SummaryCard
            label="Total Enrollments"
            value={totalEnrollments.toLocaleString()}
            caption={PERIOD_LABELS[period]}
            icon={<Users className="size-4" />}
          />
          <SummaryCard
            label="Top Earning Course"
            value={topCourse ? formatPrice(topCourse.revenue) : "—"}
            caption={topCourse?.title ?? "No purchases yet"}
            icon={<Trophy className="size-4" />}
          />
        </div>
      )}
    </div>
  );
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let title = "Something went wrong";
  let message = "An unexpected error occurred while loading analytics.";

  if (isRouteErrorResponse(error)) {
    if (error.status === 401) {
      title = "Sign in required";
      message =
        typeof error.data === "string"
          ? error.data
          : "Please select a user from the DevUI panel.";
    } else if (error.status === 403) {
      title = "Access denied";
      message =
        typeof error.data === "string"
          ? error.data
          : "Only admins can access this page.";
    } else {
      title = `Error ${error.status}`;
      message = typeof error.data === "string" ? error.data : error.statusText;
    }
  }

  return (
    <div className="flex min-h-[50vh] items-center justify-center p-6">
      <div className="text-center">
        <AlertTriangle className="mx-auto mb-4 size-12 text-muted-foreground" />
        <h1 className="mb-2 text-2xl font-bold">{title}</h1>
        <p className="mb-6 text-muted-foreground">{message}</p>
        <div className="flex items-center justify-center gap-3">
          <Link to="/">
            <Button>Go Home</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
