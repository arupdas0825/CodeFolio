// src/components/ui/ThemeModal.tsx
"use client";

import { useEffect } from "react";
import { themeLabels, useTheme, type ChartSettings, type LayoutDensity, type ThemeMode } from "./ThemeContext";
import { X } from "lucide-react";

export const ThemeModal = () => {
  const {
    modalOpen,
    closeModal,
    mode,
    setMode,
    layout,
    setLayout,
    interface: interfaceSettings,
    setInterface,
    chart: chartSettings,
    setChart,
  } = useTheme();

  // Close on Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeModal();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [closeModal]);

  if (!modalOpen) return null;

  const layoutOptions = ["default", "compact", "wide"] as const;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
      <div className="relative w-full max-w-xl rounded-xl border border-border bg-surface/90 p-6 backdrop-blur-md">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-text-primary">Theme Settings</h2>
          <button onClick={closeModal} className="rounded-full p-1 hover:bg-surface-secondary transition-colors">
            <X size={20} className="text-text-secondary" />
          </button>
        </div>

        <label className="mb-4 block">
          <span className="mb-1 block text-sm font-medium text-text-secondary">Theme</span>
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value as ThemeMode)}
            className="w-full rounded border border-border bg-background py-1.5 px-2 text-text-primary focus-visible:outline focus-visible:outline-accent"
          >
            {Object.entries(themeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>

        {/* Layout Density */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-text-secondary mb-1">Layout Density</label>
          <select
            value={layout}
            onChange={(e) => setLayout(e.target.value as LayoutDensity)}
            className="w-full rounded border border-border bg-background py-1.5 px-2 text-text-primary focus:outline-none"
          >
            {layoutOptions.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
        </div>

        {/* Interface Settings */}
        <div className="mb-4 space-y-2">
          <p className="text-sm font-medium text-text-secondary">Interface Settings</p>
          {(
            [
              { key: "animations", label: "Animations" },
              { key: "reducedMotion", label: "Reduced Motion" },
              { key: "cardHover", label: "Card Hover" },
              { key: "blurEffects", label: "Blur Effects" },
              { key: "glowEffects", label: "Glow Effects" },
              { key: "compactSidebar", label: "Compact Sidebar" },
              { key: "compactCards", label: "Compact Cards" },
            ] as const
          ).map((item) => (
            <label key={item.key} className="flex items-center justify-between text-sm text-text-primary">
              <span>{item.label}</span>
              <input
                type="checkbox"
                checked={interfaceSettings[item.key]}
                onChange={(e) => setInterface({ [item.key]: e.target.checked })}
                className="h-4 w-4 rounded border-border text-accent focus:ring-accent"
              />
            </label>
          ))}
        </div>

        {/* Chart Settings */}
        <div className="mb-4 space-y-2">
          <p className="text-sm font-medium text-text-secondary">Chart Settings</p>
          <label className="flex items-center justify-between text-sm text-text-primary">
            <span>Animated Charts</span>
            <input
              type="checkbox"
              checked={chartSettings.animatedCharts}
              onChange={(e) => setChart({ animatedCharts: e.target.checked })}
              className="h-4 w-4 rounded border-border text-accent focus:ring-accent"
            />
          </label>
          <label className="flex items-center justify-between text-sm text-text-primary">
            <span>Heatmap Style</span>
            <select
              value={chartSettings.heatmapStyle}
              onChange={(e) => setChart({ heatmapStyle: e.target.value as ChartSettings["heatmapStyle"] })}
              className="rounded border border-border bg-background py-0.5 px-1 text-text-primary focus:outline-none"
            >
              <option value="github">GitHub</option>
              <option value="codefolio">Codefolio</option>
              <option value="minimal">Minimal</option>
            </select>
          </label>
        </div>
      </div>
    </div>
  );
};
