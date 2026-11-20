// src/components/ui/ThemeContext.tsx
"use client";

import { createContext, useContext, useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from "react";

export type ThemeMode = "light" | "dark";
export const themeLabels: Record<ThemeMode, string> = { dark: "Royal Black", light: "Beige" };
export type LayoutDensity = "default" | "compact" | "wide";
export type InterfaceSettings = {
  animations: boolean;
  reducedMotion: boolean;
  cardHover: boolean;
  blurEffects: boolean;
  glowEffects: boolean;
  compactSidebar: boolean;
  compactCards: boolean;
};
export type ChartSettings = {
  animatedCharts: boolean;
  heatmapStyle: "github" | "codefolio" | "minimal";
};

export interface ThemeContextProps {
  mode: ThemeMode;
  layout: LayoutDensity;
  interface: InterfaceSettings;
  chart: ChartSettings;
  modalOpen: boolean;
  setMode: (mode: ThemeMode) => void;
  toggleThemeMode: () => void;
  setLayout: (layout: LayoutDensity) => void;
  setInterface: (settings: Partial<InterfaceSettings>) => void;
  setChart: (settings: Partial<ChartSettings>) => void;
  openModal: () => void;
  closeModal: () => void;
}

const defaultInterface: InterfaceSettings = {
  animations: true,
  reducedMotion: false,
  cardHover: true,
  blurEffects: true,
  glowEffects: true,
  compactSidebar: false,
  compactCards: false,
};

const defaultChart: ChartSettings = {
  animatedCharts: true,
  heatmapStyle: "github",
};

const ThemeContext = createContext<ThemeContextProps | undefined>(undefined);

const themeModeKey = "codefolio_theme_mode_v2";
const themeOptionsKey = "codefolio_theme_options_v2";
interface ThemeOptions {
  layout: LayoutDensity;
  interfaceSettings: InterfaceSettings;
  chartSettings: ChartSettings;
}

const defaultOptions: ThemeOptions = {
  layout: "default",
  interfaceSettings: defaultInterface,
  chartSettings: defaultChart,
};
let temporaryMode: ThemeMode | undefined;
let temporaryOptions: string | undefined;

function readThemeMode(): ThemeMode {
  if (temporaryMode) return temporaryMode;
  try {
    const mode = window.localStorage.getItem(themeModeKey);
    return mode === "light" ? "light" : "dark";
  } catch {
    return "dark";
  }
}

function initialThemeMode(): ThemeMode {
  return "dark";
}

function listenForThemeSettings(listener: () => void) {
  window.addEventListener(themeModeKey, listener);
  window.addEventListener(themeOptionsKey, listener);
  window.addEventListener("storage", listener);
  return () => {
    window.removeEventListener(themeModeKey, listener);
    window.removeEventListener(themeOptionsKey, listener);
    window.removeEventListener("storage", listener);
  };
}

function setMode(mode: ThemeMode) {
  try {
    window.localStorage.setItem(themeModeKey, mode);
    temporaryMode = undefined;
  } catch {
    temporaryMode = mode;
  }
  window.dispatchEvent(new Event(themeModeKey));
}

function readThemeOptions() {
  if (temporaryOptions) return temporaryOptions;
  try {
    const storage = window.localStorage;
    const stored = storage.getItem(themeOptionsKey);
    if (stored) return stored;
    return JSON.stringify({
      layout: storage.getItem("codefolio_layout_density"),
      interfaceSettings: JSON.parse(storage.getItem("codefolio_interface_settings") || "null"),
      chartSettings: JSON.parse(storage.getItem("codefolio_chart_settings") || "null"),
    });
  } catch {
    return "{}";
  }
}

function parseThemeOptions(snapshot: string): ThemeOptions {
  try {
    const saved = JSON.parse(snapshot) as Partial<ThemeOptions>;
    return {
      layout: saved.layout === "compact" || saved.layout === "wide" ? saved.layout : defaultOptions.layout,
      interfaceSettings: { ...defaultInterface, ...saved.interfaceSettings },
      chartSettings: { ...defaultChart, ...saved.chartSettings },
    };
  } catch {
    return defaultOptions;
  }
}

function saveThemeOptions(options: Partial<ThemeOptions>) {
  const snapshot = JSON.stringify({ ...parseThemeOptions(readThemeOptions()), ...options });
  try {
    window.localStorage.setItem(themeOptionsKey, snapshot);
    temporaryOptions = undefined;
  } catch {
    temporaryOptions = snapshot;
  }
  window.dispatchEvent(new Event(themeOptionsKey));
}

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const mode = useSyncExternalStore(listenForThemeSettings, readThemeMode, initialThemeMode);
  const options = useSyncExternalStore(listenForThemeSettings, readThemeOptions, () => "{}");
  const { layout, interfaceSettings, chartSettings } = useMemo(() => parseThemeOptions(options), [options]);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("light", mode === "light");
    root.classList.toggle("dark", mode === "dark");
    const themeColor = getComputedStyle(root).getPropertyValue("--background").trim();
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", themeColor);
  }, [mode]);

  const value: ThemeContextProps = {
    mode,
    layout,
    interface: interfaceSettings,
    chart: chartSettings,
    modalOpen,
    setMode,
    toggleThemeMode: () => setMode(mode === "light" ? "dark" : "light"),
    setLayout: (layout) => saveThemeOptions({ layout }),
    setInterface: (settings) => saveThemeOptions({ interfaceSettings: { ...interfaceSettings, ...settings } }),
    setChart: (settings) => saveThemeOptions({ chartSettings: { ...chartSettings, ...settings } }),
    openModal: () => setModalOpen(true),
    closeModal: () => setModalOpen(false),
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
};
