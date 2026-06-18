import { readSession } from "@/storage/secureStore";

type ApiOptions = {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: unknown;
  token?: string | null;
  apiUrl?: string;
  timeoutMs?: number;
};

export class ApiError extends Error {
  status: number;
  details?: unknown;

  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

function cleanUrl(apiUrl: string) {
  return apiUrl.replace(/\/$/, "");
}

export async function apiRequest<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const session = options.token === undefined || !options.apiUrl ? await readSession() : null;
  const token = options.token ?? session?.token;
  const apiUrl = cleanUrl(options.apiUrl ?? session?.apiUrl ?? "");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? 15000);

  let response: Response;

  try {
    response = await fetch(`${apiUrl}${path}`, {
      method: options.method ?? "GET",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
      signal: controller.signal
    });
  } catch (error) {
    const message =
      error instanceof Error && error.name === "AbortError"
        ? `Could not reach EduTap backend at ${apiUrl}. Check the Backend URL and Wi-Fi network.`
        : `Network request failed for ${apiUrl}. Check the Backend URL and Wi-Fi network.`;
    throw new ApiError(message, 0, error);
  } finally {
    clearTimeout(timeout);
  }

  const payload = (await response.json().catch(() => null)) as { message?: string } | null;

  if (!response.ok) {
    throw new ApiError(payload?.message ?? "Request failed.", response.status, payload);
  }

  return payload as T;
}
