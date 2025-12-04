const AUTH_STORAGE_KEY = "whatsapp_auth_user";

function getAuthHeaders(): Record<string, string> {
  try {
    const stored = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!stored) return {};
    const user = JSON.parse(stored);
    return {
      "x-user-id": user.id,
      "x-user": JSON.stringify(user),
    };
  } catch {
    return {};
  }
}

export async function fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
  const authHeaders = getAuthHeaders();
  return fetch(url, {
    ...options,
    headers: {
      ...authHeaders,
      ...(options.headers || {}),
    },
  });
}
