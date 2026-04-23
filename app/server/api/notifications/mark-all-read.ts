import { data } from "react-router";
import type { Route } from "./+types/mark-all-read";
import { getCurrentUserId } from "~/server/lib/session";
import { markAllAsRead } from "~/server/services/notificationService";

export async function action({ request }: Route.ActionArgs) {
  const currentUserId = await getCurrentUserId(request);
  if (!currentUserId) {
    throw data("Unauthorized", { status: 401 });
  }

  markAllAsRead({ userId: currentUserId });

  return { success: true };
}
