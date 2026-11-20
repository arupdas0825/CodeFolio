// src/components/ui/ThemeContext.tsx
"use client";

import { createContext, useContext, useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from "react";

export type ThemeMode = "light" | "dark" | "system";
export type ThemeProfile =
  | "codefolio-royal-black"
  | "github-dark"
  | "github-dark-dimmed"
  | "github-dark-hc"
  | "codefolio-midnight"
  | "codefolio-neon-blue"
  | "codefolio-graphite"
  | "codefolio-emerald"
  | "codefolio-purple-matrix";
export type AccentColor = "theme" | "blue" | "green" | "purple" | "orange" | "red" | "cyan";
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
  profile: ThemeProfile;
  accent: AccentColor;
  layout: LayoutDensity;
  interface: InterfaceSettings;
  chart: ChartSettings;
  modalOpen: boolean;
  setMode: (mode: ThemeMode) => void;
  toggleThemeMode: () => void;
  setProfile: (profile: ThemeProfile) => void;
  setAccent: (accent: AccentColor) => void;
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
const defaultProfile: ThemeProfile = "codefolio-royal-black";

const themeProfiles: Record<ThemeProfile, Record<string, string>> = {
  "codefolio-royal-black": {},
  "github-dark": {
    "--background": "#0d1117",
    "--surface": "#161b22",
    "--surface-secondary": "#21262d",
    "--border": "#30363d",
    "--accent": "#58a6ff",
  },
  "github-dark-dimmed": {
    "--background": "#0d1117",
    "--surface": "#161b22",
    "--surface-secondary": "#21262d",
    "--border": "#30363d",
    "--accent": "#a1aab7",
  },
  "github-dark-hc": {
    "--background": "#0d1117",
    "--surface": "#161b22",
    "--surface-secondary": "#21262d",
    "--border": "#f1e3bc",
    "--accent": "#ffb300",
  },
  "codefolio-midnight": {
    "--background": "#0a0c10",
    "--surface": "#14171c",
    "--surface-secondary": "#1a1d23",
    "--border": "#2d323c",
    "--accent": "#9db1ff",
  },
  "codefolio-neon-blue": {
    "--background": "#020617",
    "--surface": "#091135",
    "--surface-secondary": "#0d1c4a",
    "--border": "#17386b",
    "--accent": "#3b82f6",
  },
  "codefolio-graphite": {
    "--background": "#111418",
    "--surface": "#1c2127",
    "--surface-secondary": "#262c33",
    "--border": "#404752",
    "--accent": "#a2a5fa",
  },
  "codefolio-emerald": {
    "--background": "#041c15",
    "--surface": "#07352c",
    "--surface-secondary": "#084d3a",
    "--border": "#2e7d5b",
    "--accent": "#10b981",
  },
  "codefolio-purple-matrix": {
    "--background": "#181125",
    "--surface": "#241a34",
    "--surface-secondary": "#30243e",
    "--border": "#5b4475",
    "--accent": "#a78bfa",
  },
};

const accentColors: Record<Exclude<AccentColor, "theme">, string> = {
  blue: "#58a6ff",
  green: "#3fb950",
  purple: "#a371f7",
  orange: "#d29922",
  red: "#ff8c85",
  cyan: "#80caeb",
};

const themeModeKey = "codefolio_theme_mode_v2";
const themeOptionsKey = "codefolio_theme_options_v2";
const systemPreference = "(prefers-color-scheme: dark)";
const profileVariables = ["--background", "--surface", "--surface-secondary", "--border", "--accent"];
interface ThemeOptions {
  profile: ThemeProfile;
  accent: AccentColor;
  layout: LayoutDensity;
  interfaceSettings: InterfaceSettings;
  chartSettings: ChartSettings;
}

const defaultOptions: ThemeOptions = {
  profile: defaultProfile,
  accent: "theme",
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
    return mode === "light" || mode === "system" ? mode : "dark";
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
    const profile = storage.getItem("codefolio_theme_profile");
    const accent = storage.getItem("codefolio_accent_color");
    return JSON.stringify({
      profile: profile === "github-dark" ? null : profile,
      accent: accent === "blue" ? null : accent,
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
      profile: saved.profile && Object.hasOwn(themeProfiles, saved.profile) ? saved.profile : defaultOptions.profile,
      accent: saved.accent && (saved.accent === "theme" || Object.hasOwn(accentColors, saved.accent)) ? saved.accent : defaultOptions.accent,
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

function readSystemMode() {
  return window.matchMedia(systemPreference).matches;
}

function listenForSystemMode(listener: () => void) {
  const media = window.matchMedia(systemPreference);
  media.addEventListener("change", listener);
  return () => media.removeEventListener("change", listener);
}

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const mode = useSyncExternalStore(listenForThemeSettings, readThemeMode, initialThemeMode);
  const options = useSyncExternalStore(listenForThemeSettings, readThemeOptions, () => "{}");
  const { profile, accent, layout, interfaceSettings, chartSettings } = useMemo(() => parseThemeOptions(options), [options]);
  const systemDark = useSyncExternalStore(listenForSystemMode, readSystemMode, () => true);
  const effectiveMode = mode === "system" ? (systemDark ? "dark" : "light") : mode;
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("light", effectiveMode === "light");
    root.classList.toggle("dark", effectiveMode === "dark");
    for (const variable of profileVariables) root.style.removeProperty(variable);
    if (effectiveMode === "dark") {
      for (const [key, value] of Object.entries(themeProfiles[profile])) root.style.setProperty(key, value);
      if (accent !== "theme") root.style.setProperty("--accent", accentColors[accent]);
    }
    const themeColor = getComputedStyle(root).getPropertyValue("--background").trim();
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", themeColor);
  }, [effectiveMode, profile, accent]);

  const value: ThemeContextProps = {
    mode,
    profile,
    accent,
    layout,
    interface: interfaceSettings,
    chart: chartSettings,
    modalOpen,
    setMode,
    toggleThemeMode: () => setMode(effectiveMode === "light" ? "dark" : "light"),
    setProfile: (profile) => saveThemeOptions({ profile }),
    setAccent: (accent) => saveThemeOptions({ accent }),
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
