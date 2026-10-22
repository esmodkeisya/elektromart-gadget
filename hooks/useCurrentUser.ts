"use client";

import { useEffect } from "react";
import useSWR from "swr";
import { supabase } from "@/lib/supabase";
import { api, ApiError } from "@/lib/api";
import { useApiData, mutateApi } from "@/hooks/useApiData";

export type CurrentUser = { id: string; email?: string; user_metadata?: { full_name?: string } };

export type CurrentProfile = {
  id: string;
  avatar_url: string | null;
  full_name: string | null;
  role: "buyer" | "seller" | "admin" | null;
};

/** Fetcher yang menganggap 401 (belum/tidak login) sebagai user null, bukan error. */
async function authUserFetcher(path: string): Promise<{ user: CurrentUser | null }> {
  try {
    return await api<{ user: CurrentUser | null }>(path);
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) return { user: null };
    throw error;
  }
}

/**
 * Cache-backed current session + profile. Dedupes across Navbar/TopBars
 * dan langsung reset saat login/logout (tanpa perlu refresh halaman).
 */
export function useCurrentUser() {
  const { data: session, isLoading: sessionLoading } = useSWR<{ user: CurrentUser | null }, Error>(
    "/api/auth/user",
    authUserFetcher,
    { keepPreviousData: true }
  );
  const userId = session?.user?.id ?? null;
  const { data: profileRes } = useApiData<{ data: CurrentProfile | null }>(
    userId ? `/api/profiles?id=${userId}` : null
  );

  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        // Kosongkan cache segera agar UI langsung menampilkan status tamu.
        void mutateApi("/api/auth/user", { user: null }, { revalidate: false });
        void mutateApi((key) => typeof key === "string" && key.startsWith("/api/profiles"), undefined, { revalidate: false });
      } else {
        void mutateApi("/api/auth/user");
      }
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  return {
    user: session?.user ?? null,
    profile: profileRes?.data ?? null,
    loading: sessionLoading && !session,
  };
}
