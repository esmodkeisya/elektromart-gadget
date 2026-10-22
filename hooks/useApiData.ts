"use client";

import useSWR, { mutate, type SWRConfiguration, type SWRResponse } from "swr";
import { api } from "@/lib/api";

export { mutate as mutateApi };
export type { SWRResponse };

export function useApiData<T>(
  path: string | null,
  config?: SWRConfiguration<T, Error>
): SWRResponse<T, Error> {
  return useSWR<T, Error>(
    path,
    (key: string) => api<T>(key),
    {
      keepPreviousData: true,
      ...config,
    }
  );
}
