"use client";

import { useState } from "react";
import { Package } from "lucide-react";

/**
 * Small product thumbnail used next to a product name.
 * The name is rendered separately, so a failed external image must never fall
 * back to the browser's alt text (that would show the name twice).
 */
export default function ProductThumb({
  src,
  size = 20,
}: {
  src?: string | null;
  size?: number;
}) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) return <Package size={size} className="text-seller-muted" />;
  return (
    <img
      src={src}
      alt=""
      className="h-full w-full object-contain"
      onError={() => setFailed(true)}
    />
  );
}
