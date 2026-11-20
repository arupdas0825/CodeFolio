"use client";

import { Moon, Sun } from "lucide-react";
import { themeLabels, useTheme } from "@/components/ui/ThemeContext";

interface ThemeToggleProps {
  className?: string;
  showLabel?: boolean;
}

export function ThemeToggle({ className, showLabel = false }: ThemeToggleProps) {
  const { mode, toggleThemeMode } = useTheme();
  const target = mode === "light" ? "dark" : "light";
  const Icon = target === "light" ? Sun : Moon;
  const label = `Switch to ${themeLabels[target]}`;

  return (
    <button
      type="button"
      onClick={toggleThemeMode}
      title={label}
      aria-label={label}
      className={className ?? "inline-flex items-center gap-2 rounded-lg p-2 text-text-secondary hover:bg-surface-secondary hover:text-accent"}
    >
      <Icon size={19} aria-hidden="true" />
      {showLabel && <span className="text-xs font-semibold">{label}</span>}
    </button>
  );
}
