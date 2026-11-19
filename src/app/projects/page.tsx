import type { Metadata } from "next";
import { SocialPage } from "@/components/social/SocialPage";

export const metadata: Metadata = { title: "Projects · CodeFolio" };

export default function ProjectsPage() {
  return <SocialPage page="projects" />;
}
