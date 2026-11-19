import { SocialPage } from "@/components/social/SocialPage";

export default async function NetworkPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab } = await searchParams;
  return <SocialPage page="network" initialTab={tab} />;
}
