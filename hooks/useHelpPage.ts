"use client";

import { useEffect, useState } from "react";
import { defaultHelpPage, mergeHelpPage, type HelpPageData } from "@/lib/helpPages";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";

const EMPTY_PAGE: HelpPageData = {
  title: { id: "", en: "" },
  subtitle: { id: "", en: "" },
  items: [],
};

export function useHelpPage(slug: string): { data: HelpPageData; loading: boolean } {
  const [data, setData] = useState<HelpPageData>(() => defaultHelpPage(slug) ?? EMPTY_PAGE);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);

    fetch(`${API_BASE}/api/help-pages/${slug}`)
      .then(async (res) => (res.ok ? (await res.json())?.data ?? null : null))
      .then((remote) => {
        if (!active) return;
        setData(mergeHelpPage(defaultHelpPage(slug), remote));
      })
      .catch(() => {
        if (active) setData(defaultHelpPage(slug) ?? EMPTY_PAGE);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [slug]);

  return { data, loading };
}
