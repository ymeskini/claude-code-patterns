import { redirect } from "react-router";
import type { Route } from "./+types/logout";
import { destroySession } from "~/server/lib/session";

export async function action({ request }: Route.ActionArgs) {
  const cookie = await destroySession(request);

  return redirect("/", {
    headers: { "Set-Cookie": cookie },
  });
}
