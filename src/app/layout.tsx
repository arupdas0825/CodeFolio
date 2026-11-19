import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans, Inter, IBM_Plex_Mono, Space_Grotesk } from "next/font/google";
import localFont from "next/font/local";
import { ThemeProvider } from "@/components/ui/ThemeContext";
import { ThemeModal } from "@/components/ui/ThemeModal";
import { AuthModalProvider } from "@/components/auth/AuthModalContext";
import InstallPrompt from "@/components/ui/InstallPrompt";
import "./globals.css";

const displayFont = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-display",
  display: "swap",
});

const bodyFont = Inter({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

const monoFont = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-mono",
  display: "swap",
});

const brandFont = Space_Grotesk({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-brand",
  display: "swap",
});

const dinCond = localFont({ src: "./fonts/DINPro-Cond.otf", variable: "--font-din-cond", display: "swap" });
const dinBold = localFont({ src: "./fonts/DINPro-CondBold.otf", variable: "--font-din-bold", display: "swap" });
const dinMedium = localFont({ src: "./fonts/DINPro-CondMedium.otf", variable: "--font-din-medium", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"),
  title: "CodeFolio — Developer Network and Project Showcase",
  description: "Share what you build, showcase projects, and connect with other developers on CodeFolio.",
  keywords: ["developer identity", "developer network", "GitHub profile card", "developer score", "open source portfolio", "developer ecosystem"],
  icons: {
    icon: [
      { url: "/favicon.ico?v=1" },
      { url: "/favicon-16x16.png?v=1", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png?v=1", sizes: "32x32", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png?v=1", sizes: "180x180", type: "image/png" },
    ],
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Codefolio",
  },
  openGraph: {
    title: "CodeFolio — Developer Network and Project Showcase",
    description: "Discover projects, follow developers, and share milestones with the CodeFolio community.",
    images: [
      {
        url: "/codefolio-logo.png?v=1",
        width: 1200,
        height: 1200,
        alt: "Codefolio Logo",
      },
    ],
  },
};

export const viewport: Viewport = {
  themeColor: "#0f172a",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ThemeProvider>
      <html
        lang="en"
        className={`${displayFont.variable} ${bodyFont.variable} ${monoFont.variable} ${brandFont.variable} ${dinCond.variable} ${dinBold.variable} ${dinMedium.variable} h-full antialiased`}
        suppressHydrationWarning
      >
        <head>
        </head>
        <body className="min-h-full flex flex-col bg-background text-foreground font-inter">
          <AuthModalProvider>
            {children}
            <ThemeModal />
            <InstallPrompt />
          </AuthModalProvider>
        </body>
      </html>
    </ThemeProvider>
  );
}
