"use client";

import type { ReactNode } from "react";
import { SWRConfig } from "swr";

export default function SWRProvider({ children }: { children: ReactNode }) {
  return (
    <SWRConfig
      value={{
        revalidateOnFocus: false,
        revalidateOnReconnect: false,
        revalidateIfStale: false,
        keepPreviousData: true,
        dedupingInterval: 30000,
        focusThrottleInterval: 60000,
        errorRetryCount: 2,
      }}
    >
      {children}
    </SWRConfig>
  );
}
