import { SocialPage } from "@/components/social/SocialPage";

export default async function DeveloperPage({
  params,
  searchParams,
}: {
  params: Promise<{ username: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const [{ username }, { tab }] = await Promise.all([params, searchParams]);
  return <SocialPage page="profile" slug={username.toLowerCase()} initialTab={tab} />;
}
