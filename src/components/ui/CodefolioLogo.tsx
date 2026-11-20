import Image from "next/image";

export interface CodefolioLogoProps {
  className?: string;
  size?: number;
  animated?: boolean;
  alt?: string;
}

export function CodefolioLogo({ className = "", size = 36, animated = false, alt = "" }: CodefolioLogoProps) {
  return <Image
    src="/codefolio-logo.png?v=3"
    alt={alt}
    width={size}
    height={size}
    unoptimized
    loading="eager"
    className={`shrink-0 object-contain ${animated ? "motion-safe:transition-transform motion-safe:hover:scale-105 " : ""}${className}`}
  />;
}
