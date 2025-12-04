import { getAuthHeaders } from "../contexts/AuthContext";

type FetchOptions = RequestInit & {
  skipAuth?: boolean;
};

export async function apiFetch(url: string, options: FetchOptions = {}): Promise<Response> {
  const { skipAuth = false, headers = {}, ...rest } = options;
  
  const authHeaders = skipAuth ? {} : getAuthHeaders();
  
  return fetch(url, {
    ...rest,
    headers: {
      ...authHeaders,
      ...(headers as Record<string, string>),
    },
  });
}

export async function apiGet(url: string, options: FetchOptions = {}): Promise<Response> {
  return apiFetch(url, { ...options, method: "GET" });
}

export async function apiPost(url: string, body?: unknown, options: FetchOptions = {}): Promise<Response> {
  return apiFetch(url, {
    ...options,
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string> || {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}

export async function apiPut(url: string, body?: unknown, options: FetchOptions = {}): Promise<Response> {
  return apiFetch(url, {
    ...options,
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string> || {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}

export async function apiDelete(url: string, options: FetchOptions = {}): Promise<Response> {
  return apiFetch(url, { ...options, method: "DELETE" });
}
