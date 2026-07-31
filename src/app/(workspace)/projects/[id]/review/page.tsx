import { redirect } from "next/navigation";

import { workspaceViewHref } from "@/lib/workspaceRoutes";

export default async function ReviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(workspaceViewHref(id, "review"));
}
