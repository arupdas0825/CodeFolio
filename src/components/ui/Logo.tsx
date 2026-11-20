import { cn } from "@/lib/utils";
import { CodefolioLogo } from "./CodefolioLogo";

interface LogoProps {
  className?: string;
  size?: number;
  showText?: boolean;
  textSize?: string;
  showTagline?: boolean;
  animated?: boolean;
}

export default function Logo({
  className,
  size = 36,
  showText = false,
  textSize = "text-lg",
  showTagline = false,
  animated = false,
}: LogoProps) {
  return <div className={cn("flex items-center gap-2.5 select-none", className)}>
    <CodefolioLogo size={size} animated={animated} alt={showText ? "" : "CodeFolio"} />
    {showText && <div className="flex flex-col text-left">
      <span className={cn("font-bold tracking-tight font-space-grotesk text-text-primary leading-none", textSize)}>CodeFolio</span>
      {showTagline && <span className="mt-1 text-[11px] text-text-secondary">Developer network</span>}
    </div>}
  </div>;
}
