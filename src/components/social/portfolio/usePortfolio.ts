"use client";

import { useEffect, useState } from "react";
import {
  fetchGitHubPins, fetchPortfolioEvents, fetchPortfolioProfile, fetchPortfolioRepositories,
  type PortfolioEvent, type PortfolioProfile,
} from "@/services/github/github-portfolio.service";
import type { GitHubRepository } from "@/types/github";

interface PortfolioData {
  key: string;
  profile?: PortfolioProfile | null;
  repositories?: GitHubRepository[] | null;
  events?: PortfolioEvent[] | null;
  pins?: string[];
}

export function usePortfolio(username: string | undefined, enabled: boolean, own: boolean, token?: string) {
  const [result, setResult] = useState<PortfolioData>();
  const key = `${username || ""}:${own}`;
  const current = result?.key === key ? result : undefined;

  useEffect(() => {
    if (!enabled || !username || !/^[a-z0-9-]{1,39}$/i.test(username)) return;
    const controller = new AbortController();
    const options = { token, signal: controller.signal };
    function update(patch: Partial<PortfolioData>) {
      if (!controller.signal.aborted) setResult((current) => ({ ...(current?.key === key ? current : {}), key, ...patch }));
    }
    fetchPortfolioProfile(username, options, own).then((profile) => update({ profile })).catch(() => update({ profile: null }));
    fetchPortfolioRepositories(username, options).then((repositories) => update({ repositories })).catch(() => update({ repositories: null }));
    fetchPortfolioEvents(username, options).then((events) => update({ events })).catch(() => update({ events: null }));
    if (token) fetchGitHubPins(username, options).then((pins) => update({ pins })).catch(() => update({ pins: [] }));
    return () => controller.abort();
  }, [username, token, own, enabled, key]);

  return current;
}
