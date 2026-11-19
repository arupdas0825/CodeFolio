import { SocialPage } from "@/components/social/SocialPage";

export default async function PostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <SocialPage page="post" slug={id} />;
}
