import { useQuery, useMutation } from "@tanstack/react-query";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";
const API = `${BASE}/api`;

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) throw new Error(`API error ${res.status}: ${path}`);
  return res.json() as Promise<T>;
}

export function useApiGet<T>(path: string, queryKey?: unknown[]) {
  return useQuery<T>({
    queryKey: queryKey || [path],
    queryFn: () => apiFetch<T>(path),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

export function useApiPost<TReq, TRes>(path: string) {
  return useMutation<TRes, Error, TReq>({
    mutationFn: (body: TReq) => apiFetch<TRes>(path, { method: "POST", body: JSON.stringify(body) }),
  });
}
