import { redirect } from "next/navigation";
import { SocialPage } from "@/components/social/SocialPage";

export default async function DeveloperPage({
  params,
  searchParams,
}: {
  params: Promise<{ username: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const [{ username }, { tab }] = await Promise.all([params, searchParams]);
  if (tab === "analytics" || tab === "achievements") redirect(`/insights/${encodeURIComponent(username)}?tab=${tab}`);
  return <SocialPage page="profile" slug={username.toLowerCase()} initialTab={tab} />;
}
