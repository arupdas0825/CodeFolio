import { SocialPage } from "@/components/social/SocialPage";

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  return <SocialPage page="search" slug={typeof q === "string" ? q.slice(0, 120) : ""} />;
}
