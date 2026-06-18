import { readSession } from "@/storage/session";

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

function cleanUrl(url: string) {
  return url.replace(/\/$/, "");
}

type ApiRequestOptions = { method?: string; body?: unknown; token?: string | null; apiUrl?: string };

async function getRequestContext(options: Pick<ApiRequestOptions, "token" | "apiUrl"> = {}) {
  const session = options.token || options.apiUrl ? null : await readSession();
  const token = options.token ?? session?.token;
  const apiUrl = cleanUrl(options.apiUrl ?? session?.apiUrl ?? "");

  return { apiUrl, token };
}

export async function apiRequest<T>(path: string, options: ApiRequestOptions = {}) {
  const { apiUrl, token } = await getRequestContext(options);
  const response = await fetch(`${apiUrl}${path}`, {
    method: options.method ?? "GET",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: options.body ? JSON.stringify(options.body) : undefined
  });
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new ApiError(payload?.message ?? "Request failed.", response.status);
  }

  return payload as T;
}
