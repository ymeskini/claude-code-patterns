import { data } from "react-router";
import { z } from "zod";
import type { Route } from "./+types/mark-read";
import { getCurrentUserId } from "~/server/lib/session";
import { parseFormData } from "~/server/lib/validation";
import {
  getNotificationById,
  markAsRead,
} from "~/server/services/notificationService";

const schema = z.object({
  notificationId: z.coerce.number().int().positive(),
});

export async function action({ request }: Route.ActionArgs) {
  const currentUserId = await getCurrentUserId(request);
  if (!currentUserId) {
    throw data("Unauthorized", { status: 401 });
  }

  const formData = await request.formData();
  const parsed = parseFormData(formData, schema);
  if (!parsed.success) {
    throw data("Invalid parameters", { status: 400 });
  }

  const notification = getNotificationById(parsed.data.notificationId);
  if (!notification || notification.recipientUserId !== currentUserId) {
    throw data("Not found", { status: 404 });
  }

  markAsRead({ notificationId: parsed.data.notificationId });

  return { success: true };
}
