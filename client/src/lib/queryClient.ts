import { QueryClient, QueryFunction } from "@tanstack/react-query";

const AUTH_STORAGE_KEY = "whatsapp_auth_user";

function getAuthHeaders(): Record<string, string> {
  try {
    const stored = localStorage.getItem(AUTH_STORAGE_KEY);
    console.log('[QueryClient] Raw localStorage:', stored);
    if (!stored) {
      console.log('[QueryClient] No user in localStorage');
      return {};
    }
    const user = JSON.parse(stored);
    console.log('[QueryClient] Parsed user:', user);
    const headers = {
      "x-user-id": user.id || '',
      "x-user-role": user.role || 'user',
      "x-user-name": user.name || '',
      "x-user": JSON.stringify(user),
    };
    console.log('[QueryClient] Sending headers:', headers);
    return headers;
  } catch (e) {
    console.error('[QueryClient] Error parsing user:', e);
    return {};
  }
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const authHeaders = getAuthHeaders();
  const res = await fetch(url, {
    method,
    headers: {
      ...authHeaders,
      ...(data ? { "Content-Type": "application/json" } : {}),
    },
    body: data ? JSON.stringify(data) : undefined,
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const authHeaders = getAuthHeaders();
    const res = await fetch(queryKey.join("/") as string, {
      headers: authHeaders,
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
