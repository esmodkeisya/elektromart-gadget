"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function SellerAvatar({ className = "h-9 w-9" }: { className?: string }) {
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    void supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      const { data: profile } = await supabase
        .from("profiles")
        .select("avatar_url")
        .eq("id", data.user.id)
        .maybeSingle();
      if (mounted) setAvatarUrl(profile?.avatar_url ?? null);
    });
    return () => {
      mounted = false;
    };
  }, []);

  if (avatarUrl) {
    return <img src={avatarUrl} alt="Profil seller" className={`rounded-full object-cover ${className}`} />;
  }

  return (
    <span className={`inline-flex overflow-hidden rounded-full bg-[#dbe7ff] ${className}`} aria-hidden>
      <svg viewBox="0 0 36 36" className="h-full w-full">
        <circle cx="18" cy="18" r="18" fill="#C9D8F8" />
        <circle cx="18" cy="14" r="6.2" fill="#F4C7A8" />
        <path d="M8 32c1.6-7 6.2-10.5 10-10.5S26.4 25 28 32" fill="#0A1C47" />
        <path d="M10.5 13.5c2.2-4.2 12.8-4.2 15 0-2.4-5.8-12.6-5.8-15 0Z" fill="#1B2A4A" />
      </svg>
    </span>
  );
}
