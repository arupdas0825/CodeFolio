import { SocialPage } from "@/components/social/SocialPage";

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <SocialPage page="project" slug={id} />;
}
