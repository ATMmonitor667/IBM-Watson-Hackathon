import { redirect } from "next/navigation";

import { workspaceViewHref } from "@/lib/workspaceRoutes";

export default async function CharactersPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(workspaceViewHref(id, "characters"));
}
