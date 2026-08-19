type SmsLenzConfig =
  | {
      ok: true;
      apiUrl: string;
      apiKey: string;
      senderId: string;
      timeoutMs: number;
      userId: string;
    }
  | {
      ok: false;
      reason: string;
    };

export type SmsLenzSendResult = {
  ok: boolean;
  recipient: string;
  provider: "smslenz";
  providerRef?: string | null;
  statusCode?: number;
  response?: unknown;
  error?: string;
};

const DEFAULT_SMSLENZ_API_URL = "https://smslenz.lk/api/send-sms";

export function getSmsLenzConfig(): SmsLenzConfig {
  const userId = process.env.SMSLENZ_USER_ID?.trim();
  const apiKey = process.env.SMSLENZ_API_KEY?.trim();
  const senderId = process.env.SMSLENZ_SENDER_ID?.trim();

  if (!userId) {
    return { ok: false, reason: "SMSLENZ_USER_ID is not configured." };
  }

  if (!apiKey) {
    return { ok: false, reason: "SMSLENZ_API_KEY is not configured." };
  }

  if (!senderId) {
    return { ok: false, reason: "SMSLENZ_SENDER_ID is not configured." };
  }

  return {
    ok: true,
    userId,
    apiKey,
    senderId,
    timeoutMs: Number.parseInt(process.env.SMSLENZ_TIMEOUT_MS || "15000", 10),
    apiUrl: process.env.SMSLENZ_API_URL?.trim() || DEFAULT_SMSLENZ_API_URL
  };
}

function normalizeSingleSmsRecipient(value: string) {
  if (!value) return null;

  const digits = value.replace(/\D/g, "");
  const normalized = digits.startsWith("0094") ? digits.slice(2) : digits;

  if (/^94\d{9}$/.test(normalized)) {
    return normalized;
  }

  if (/^0\d{9}$/.test(normalized)) {
    return `94${normalized.slice(1)}`;
  }

  if (/^7\d{8}$/.test(normalized)) {
    return `94${normalized}`;
  }

  return null;
}

export function normalizeSmsRecipient(value: string | null | undefined) {
  if (!value) return null;

  const direct = normalizeSingleSmsRecipient(value);
  if (direct) return direct;

  const parts = value.split(/[\/,;|]/).map((part) => part.trim()).filter(Boolean);
  for (const part of parts) {
    const normalized = normalizeSingleSmsRecipient(part);
    if (normalized) return normalized;
  }

  return null;
}

function providerReference(response: unknown) {
  if (!response || typeof response !== "object") return null;

  const data = response as Record<string, unknown>;
  const nestedData = data.data && typeof data.data === "object" ? (data.data as Record<string, unknown>) : {};
  const candidates = [
    data.uid,
    data.id,
    data.message_id,
    data.messageId,
    data.reference,
    data.ref,
    nestedData.campaign_id,
    nestedData.message_id
  ];
  const match = candidates.find((candidate) => typeof candidate === "string" || typeof candidate === "number");

  return match === undefined ? null : String(match);
}

function responseSucceeded(response: Response, body: unknown) {
  if (!response.ok) return false;
  if (!body || typeof body !== "object") return true;

  const data = body as Record<string, unknown>;
  const nestedData = data.data && typeof data.data === "object" ? (data.data as Record<string, unknown>) : {};

  if (data.success === false) return false;
  if (typeof nestedData.status === "string" && nestedData.status.toLowerCase() !== "success") return false;

  return true;
}

function responseError(response: Response, body: unknown) {
  if (typeof body === "string") return body;
  if (body && typeof body === "object") {
    const data = body as Record<string, unknown>;
    if (typeof data.message === "string") return data.message;
    if (typeof data.error === "string") return data.error;
  }
  return response.statusText;
}

async function readResponse(response: Response) {
  const text = await response.text();
  if (!text) return null;

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

export async function sendSmsLenzSms(input: { recipient: string; message: string }): Promise<SmsLenzSendResult> {
  const config = getSmsLenzConfig();
  if (!config.ok) {
    return {
      ok: false,
      recipient: input.recipient,
      provider: "smslenz",
      error: config.reason
    };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.timeoutMs);

  try {
    const response = await fetch(config.apiUrl, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        user_id: config.userId,
        api_key: config.apiKey,
        sender_id: config.senderId,
        contact: input.recipient,
        message: input.message
      }),
      signal: controller.signal
    });

    const body = await readResponse(response);
    const ok = responseSucceeded(response, body);

    return {
      ok,
      recipient: input.recipient,
      provider: "smslenz",
      providerRef: providerReference(body),
      statusCode: response.status,
      response: body,
      error: ok ? undefined : responseError(response, body)
    };
  } catch (error) {
    return {
      ok: false,
      recipient: input.recipient,
      provider: "smslenz",
      error: error instanceof Error && error.name === "AbortError" ? "SMSLenz request timed out." : "SMSLenz request failed."
    };
  } finally {
    clearTimeout(timeout);
  }
}
