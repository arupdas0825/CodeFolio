import type { Metadata } from "next";
import { SocialPage } from "@/components/social/SocialPage";

export const metadata: Metadata = { title: "Developer Feed · CodeFolio" };

export default function FeedPage() {
  return <SocialPage page="feed" />;
}
