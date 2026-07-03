import { createHmac, randomUUID, timingSafeEqual } from "crypto";
import type { LiveClassMeetingProvider, LiveClassProvider, Prisma } from "@prisma/client";
import { decryptIntegrationToken, decryptSecret, encryptSecret, getProviderCredentials, upsertEncryptedIntegrationTokens } from "@/lib/provider-credentials";
import { prisma } from "@/lib/prisma";

type MeetingInput = {
  instituteId: string;
  userId: string;
  title: string;
  description?: string | null;
  startTime: Date;
  durationMinutes: number;
  settings?: ZoomMeetingOptionInput;
};

export type ZoomMeetingOptionInput = {
  waitingRoom?: boolean;
  passcode?: boolean;
  joinBeforeHost?: boolean;
  muteOnEntry?: boolean;
  recording?: "none" | "local" | "cloud";
  hostVideo?: boolean;
  participantVideo?: boolean;
  alternativeHosts?: string | null;
  recurring?: boolean;
};

const DEFAULT_ZOOM_OAUTH_SCOPES = ["user:read:user", "meeting:write:meeting", "recording:read"];
const ZOOM_PROFILE_SCOPES = ["user:read:user", "user:read:user:admin", "user:read", "user:read:admin"];

export type CreatedMeeting = {
  provider: LiveClassProvider;
  meetingUrl: string;
  externalUrl?: string | null;
  meetingId?: string | null;
  joinUrl?: string | null;
  startUrl?: string | null;
  meetingPassword?: string | null;
  calendarEventId?: string | null;
  providerResponse?: Prisma.InputJsonValue;
};

export function providerFromMeetingProvider(meetingProvider: LiveClassMeetingProvider): LiveClassProvider {
  if (meetingProvider === "ZOOM_AUTO" || meetingProvider === "EXTERNAL_ZOOM") return "ZOOM";
  if (meetingProvider === "GOOGLE_MEET_AUTO" || meetingProvider === "EXTERNAL_GOOGLE_MEET") return "GOOGLE_MEET";
  if (meetingProvider === "YOUTUBE_LIVE") return "YOUTUBE_LIVE";
  return "OTHER";
}

export function isAutoMeetingProvider(provider: LiveClassMeetingProvider) {
  return provider === "ZOOM_AUTO" || provider === "GOOGLE_MEET_AUTO";
}

export function isExternalMeetingProvider(provider: LiveClassMeetingProvider) {
  return !isAutoMeetingProvider(provider);
}

export function meetingProviderLabel(provider: string) {
  const labels: Record<string, string> = {
    ZOOM_AUTO: "Zoom Auto Meeting",
    GOOGLE_MEET_AUTO: "Google Meet Auto Meeting",
    EXTERNAL_ZOOM: "External Zoom Link",
    EXTERNAL_GOOGLE_MEET: "External Google Meet Link",
    YOUTUBE_LIVE: "YouTube Live Link",
    OTHER_LINK: "Other Link"
  };

  return labels[provider] ?? provider;
}

export function externalUrlForProvider(provider: LiveClassMeetingProvider, url: string): CreatedMeeting {
  return {
    provider: providerFromMeetingProvider(provider),
    meetingUrl: url,
    externalUrl: url,
    joinUrl: url
  };
}

export async function createAutoMeeting(provider: LiveClassMeetingProvider, input: MeetingInput): Promise<CreatedMeeting> {
  if (provider === "ZOOM_AUTO") return createZoomMeeting(input);
  if (provider === "GOOGLE_MEET_AUTO") return createGoogleMeetMeeting(input);
  throw new Error("Auto meeting creation is not available for this provider.");
}

async function createZoomMeeting(input: MeetingInput): Promise<CreatedMeeting> {
  const token = await getZoomAccessTokenForUser(input.userId);
  const settings = await zoomMeetingSettings(input.userId, input.settings);
  const response = await fetch("https://api.zoom.us/v2/users/me/meetings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      topic: input.title,
      type: settings.recurring ? 8 : 2,
      start_time: input.startTime.toISOString(),
      duration: input.durationMinutes,
      timezone: "UTC",
      agenda: input.description ?? undefined,
      settings: {
        host_video: settings.hostVideo,
        participant_video: settings.participantVideo,
        join_before_host: settings.joinBeforeHost,
        waiting_room: settings.waitingRoom,
        mute_upon_entry: settings.muteOnEntry,
        approval_type: 2,
        auto_recording: settings.recording,
        ...(settings.passcode ? {} : { password: "" }),
        ...(settings.alternativeHosts ? { alternative_hosts: settings.alternativeHosts } : {})
      }
    })
  });
  const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>;

  if (!response.ok || typeof payload.join_url !== "string") {
    throw new Error(readProviderError(payload, "Zoom meeting creation failed."));
  }

  return {
    provider: "ZOOM",
    meetingUrl: payload.join_url,
    meetingId: payload.id ? String(payload.id) : null,
    joinUrl: payload.join_url,
    startUrl: typeof payload.start_url === "string" ? payload.start_url : null,
    meetingPassword: typeof payload.password === "string" ? payload.password : null,
    providerResponse: payload as Prisma.InputJsonObject
  };
}

function zoomOAuthSecret() {
  const secret = process.env.PROVIDER_CREDENTIAL_KEY ?? process.env.NEXTAUTH_SECRET ?? process.env.AUTH_SECRET;
  if (!secret) throw new Error("Set NEXTAUTH_SECRET before connecting Zoom.");
  return secret;
}

function zoomRedirectUri(origin: string) {
  return process.env.ZOOM_REDIRECT_URI ?? `${origin}/api/integrations/zoom/callback`;
}

function getZoomOAuthCredentials() {
  const clientId = process.env.ZOOM_CLIENT_ID;
  const clientSecret = process.env.ZOOM_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("Zoom OAuth is not configured. Set ZOOM_CLIENT_ID and ZOOM_CLIENT_SECRET on the server.");
  }

  return { clientId, clientSecret };
}

function zoomOAuthScopes() {
  const scopes = (process.env.ZOOM_OAUTH_SCOPES ?? DEFAULT_ZOOM_OAUTH_SCOPES.join(" "))
    .split(/[\s,]+/)
    .map((scope) => scope.trim())
    .filter(Boolean);

  return Array.from(new Set(scopes));
}

function tokenHasAnyScope(scope: string | undefined, candidates: string[]) {
  if (!scope) return true;
  const grantedScopes = new Set(scope.split(/[\s,]+/).filter(Boolean));
  return candidates.some((candidate) => grantedScopes.has(candidate));
}

export async function createZoomOAuthUrl(input: { instituteId: string; userId: string; origin: string }) {
  const { clientId } = getZoomOAuthCredentials();
  const payload = Buffer.from(
    JSON.stringify({
      instituteId: input.instituteId,
      userId: input.userId,
      nonce: randomUUID(),
      ts: Date.now()
    })
  ).toString("base64url");
  const signature = createHmac("sha256", zoomOAuthSecret()).update(payload).digest("base64url");
  const url = new URL("https://zoom.us/oauth/authorize");

  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", zoomRedirectUri(input.origin));
  url.searchParams.set("scope", zoomOAuthScopes().join(" "));
  url.searchParams.set("state", `${payload}.${signature}`);

  return url.toString();
}

export function verifyZoomOAuthState(state: string) {
  const [payload, signature] = state.split(".");
  if (!payload || !signature) throw new Error("Zoom connection state is invalid.");

  const expected = createHmac("sha256", zoomOAuthSecret()).update(payload).digest("base64url");
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (signatureBuffer.length !== expectedBuffer.length || !timingSafeEqual(signatureBuffer, expectedBuffer)) {
    throw new Error("Zoom connection state could not be verified.");
  }

  const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { instituteId: string; userId: string; ts: number };
  if (Date.now() - parsed.ts > 10 * 60_000) throw new Error("Zoom connection state expired. Please try again.");

  return parsed;
}

export async function exchangeZoomCode(input: { code: string; state: string; origin: string }) {
  const state = verifyZoomOAuthState(input.state);
  const { clientId, clientSecret } = getZoomOAuthCredentials();
  const response = await fetch("https://zoom.us/oauth/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({
      code: input.code,
      redirect_uri: zoomRedirectUri(input.origin),
      grant_type: "authorization_code"
    })
  });
  const payload = (await response.json().catch(() => ({}))) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    scope?: string;
  } & Record<string, unknown>;

  if (!response.ok || !payload.access_token || !payload.refresh_token) {
    throw new Error(readProviderError(payload, "Zoom OAuth token exchange failed."));
  }

  if (!tokenHasAnyScope(payload.scope, ZOOM_PROFILE_SCOPES)) {
    throw new Error(
      `Zoom OAuth token is missing a user profile scope. Add one of these scopes to the Zoom app and reconnect: ${ZOOM_PROFILE_SCOPES.join(", ")}.`
    );
  }

  const profile = await fetchZoomUserProfile(payload.access_token);
  await prisma.zoomConnection.upsert({
    where: { userId: state.userId },
    create: {
      userId: state.userId,
      zoomAccountId: profile.zoomAccountId,
      email: profile.email,
      displayName: profile.displayName,
      accessToken: encryptSecret(payload.access_token),
      refreshToken: encryptSecret(payload.refresh_token),
      expiresAt: new Date(Date.now() + (payload.expires_in ?? 3600) * 1000),
      lastSyncAt: new Date()
    },
    update: {
      zoomAccountId: profile.zoomAccountId,
      email: profile.email,
      displayName: profile.displayName,
      accessToken: encryptSecret(payload.access_token),
      refreshToken: encryptSecret(payload.refresh_token),
      expiresAt: new Date(Date.now() + (payload.expires_in ?? 3600) * 1000),
      lastSyncAt: new Date()
    }
  });

  await prisma.zoomMeetingSettings.upsert({
    where: { userId: state.userId },
    create: { userId: state.userId },
    update: {}
  });

  return state;
}

async function fetchZoomUserProfile(accessToken: string) {
  const response = await fetch("https://api.zoom.us/v2/users/me", {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>;

  if (!response.ok) {
    throw new Error(readProviderError(payload, "Zoom account profile lookup failed."));
  }

  const email = typeof payload.email === "string" ? payload.email : "";
  const id = typeof payload.id === "string" ? payload.id : "";
  const accountId = typeof payload.account_id === "string" ? payload.account_id : id;
  const displayName =
    typeof payload.display_name === "string"
      ? payload.display_name
      : [payload.first_name, payload.last_name].filter((item): item is string => typeof item === "string" && item.length > 0).join(" ");

  if (!email || !accountId) throw new Error("Zoom account profile did not include an email or account ID.");

  return { email, zoomAccountId: accountId, displayName: displayName || email };
}

export async function getZoomAccessTokenForUser(userId: string) {
  const connection = await prisma.zoomConnection.findUnique({ where: { userId } });
  if (!connection) throw new Error("Zoom is not connected. Connect your Zoom account in Live Class Settings.");

  if (connection.expiresAt.getTime() > Date.now() + 60_000) {
    return decryptSecret(connection.accessToken);
  }

  return refreshZoomAccessToken(userId);
}

export async function refreshZoomAccessToken(userId: string) {
  const connection = await prisma.zoomConnection.findUnique({ where: { userId } });
  if (!connection) throw new Error("Zoom is not connected. Connect your Zoom account in Live Class Settings.");

  const { clientId, clientSecret } = getZoomOAuthCredentials();
  const response = await fetch("https://zoom.us/oauth/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: decryptSecret(connection.refreshToken)
    })
  });
  const payload = (await response.json().catch(() => ({}))) as { access_token?: string; refresh_token?: string; expires_in?: number } & Record<string, unknown>;

  if (!response.ok || !payload.access_token) {
    throw new Error(readProviderError(payload, "Zoom token refresh failed. Please reconnect Zoom."));
  }

  await prisma.zoomConnection.update({
    where: { userId },
    data: {
      accessToken: encryptSecret(payload.access_token),
      refreshToken: payload.refresh_token ? encryptSecret(payload.refresh_token) : undefined,
      expiresAt: new Date(Date.now() + (payload.expires_in ?? 3600) * 1000),
      lastSyncAt: new Date()
    }
  });

  return payload.access_token;
}

export async function testZoomOAuthConnection(userId: string) {
  const token = await getZoomAccessTokenForUser(userId);
  const profile = await fetchZoomUserProfile(token);
  await prisma.zoomConnection.update({
    where: { userId },
    data: {
      zoomAccountId: profile.zoomAccountId,
      email: profile.email,
      displayName: profile.displayName,
      lastSyncAt: new Date()
    }
  });
  return profile;
}

async function zoomMeetingSettings(userId: string, overrides?: ZoomMeetingOptionInput) {
  const settings = await prisma.zoomMeetingSettings.upsert({
    where: { userId },
    create: { userId },
    update: {}
  });

  return {
    waitingRoom: overrides?.waitingRoom ?? settings.defaultWaitingRoom,
    passcode: overrides?.passcode ?? settings.defaultPasscodeGeneration,
    joinBeforeHost: overrides?.joinBeforeHost ?? settings.defaultJoinBeforeHost,
    muteOnEntry: overrides?.muteOnEntry ?? settings.defaultMuteParticipants,
    recording: overrides?.recording ?? (settings.defaultRecording as "none" | "local" | "cloud"),
    hostVideo: overrides?.hostVideo ?? settings.defaultHostVideo,
    participantVideo: overrides?.participantVideo ?? settings.defaultParticipantVideo,
    alternativeHosts: overrides?.alternativeHosts ?? null,
    recurring: overrides?.recurring ?? false
  };
}

export async function syncZoomRecordingForLiveClass(input: { userId: string; liveClassId: string }) {
  const liveClass = await prisma.liveClass.findUnique({ where: { id: input.liveClassId }, include: { zoomMeeting: true } });
  if (!liveClass?.zoomMeeting?.zoomMeetingId) throw new Error("This live class does not have a Zoom meeting.");

  const token = await getZoomAccessTokenForUser(input.userId);
  const response = await fetch(`https://api.zoom.us/v2/meetings/${encodeURIComponent(liveClass.zoomMeeting.zoomMeetingId)}/recordings`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>;

  if (!response.ok) {
    throw new Error(readProviderError(payload, "Zoom recording lookup failed."));
  }

  const files = Array.isArray(payload.recording_files) ? payload.recording_files : [];
  const recording = files.find((file): file is Record<string, unknown> => {
    return Boolean(file && typeof file === "object" && typeof (file as Record<string, unknown>).play_url === "string");
  });
  const recordingUrl = typeof recording?.play_url === "string" ? recording.play_url : null;

  await prisma.zoomMeeting.update({
    where: { liveClassId: input.liveClassId },
    data: {
      status: typeof payload.status === "string" ? payload.status : liveClass.zoomMeeting.status,
      recordingImported: Boolean(recordingUrl),
      recordingUrl,
      recordingMetadata: payload as Prisma.InputJsonObject,
      updatedAt: new Date()
    }
  });

  return { recordingUrl, payload };
}

function googleOAuthSecret() {
  const secret = process.env.PROVIDER_CREDENTIAL_KEY ?? process.env.NEXTAUTH_SECRET ?? process.env.AUTH_SECRET;
  if (!secret) throw new Error("Set NEXTAUTH_SECRET before connecting Google.");
  return secret;
}

function googleRedirectUri(origin: string) {
  return process.env.GOOGLE_REDIRECT_URI ?? `${origin}/api/integrations/google/callback`;
}

async function getGoogleOAuthCredentials(instituteId: string) {
  const credentials = await getProviderCredentials(instituteId, "GOOGLE", ["clientId", "clientSecret"]);
  const clientId = credentials.clientId ?? process.env.GOOGLE_CLIENT_ID;
  const clientSecret = credentials.clientSecret ?? process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("Google OAuth is not configured. Add a Google Client ID and Client Secret in Live Class settings.");
  }

  return { clientId, clientSecret };
}

export async function createGoogleOAuthUrl(input: { instituteId: string; userId: string; origin: string }) {
  const { clientId } = await getGoogleOAuthCredentials(input.instituteId);
  const payload = Buffer.from(
    JSON.stringify({
      instituteId: input.instituteId,
      userId: input.userId,
      nonce: randomUUID(),
      ts: Date.now()
    })
  ).toString("base64url");
  const signature = createHmac("sha256", googleOAuthSecret()).update(payload).digest("base64url");
  const state = `${payload}.${signature}`;
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");

  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", googleRedirectUri(input.origin));
  url.searchParams.set("response_type", "code");
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent");
  url.searchParams.set("scope", "openid email profile https://www.googleapis.com/auth/calendar.events");
  url.searchParams.set("state", state);

  return url.toString();
}

export function verifyGoogleOAuthState(state: string) {
  const [payload, signature] = state.split(".");
  if (!payload || !signature) throw new Error("Google connection state is invalid.");

  const expected = createHmac("sha256", googleOAuthSecret()).update(payload).digest("base64url");
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (signatureBuffer.length !== expectedBuffer.length || !timingSafeEqual(signatureBuffer, expectedBuffer)) {
    throw new Error("Google connection state could not be verified.");
  }

  const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { instituteId: string; userId: string; ts: number };
  if (Date.now() - parsed.ts > 10 * 60_000) throw new Error("Google connection state expired. Please try again.");

  return parsed;
}

export async function exchangeGoogleCode(input: { code: string; state: string; origin: string }) {
  const state = verifyGoogleOAuthState(input.state);
  const { clientId, clientSecret } = await getGoogleOAuthCredentials(state.instituteId);
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code: input.code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: googleRedirectUri(input.origin),
      grant_type: "authorization_code"
    })
  });
  const payload = (await response.json().catch(() => ({}))) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    scope?: string;
    error_description?: string;
  };

  if (!response.ok || !payload.access_token) {
    throw new Error(payload.error_description ?? "Google OAuth token exchange failed.");
  }

  const profile = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: { Authorization: `Bearer ${payload.access_token}` }
  }).then((res) => res.json().catch(() => ({}))) as { email?: string; id?: string };

  await upsertEncryptedIntegrationTokens({
    instituteId: state.instituteId,
    provider: "GOOGLE",
    accessToken: payload.access_token,
    refreshToken: payload.refresh_token,
    tokenExpiresAt: payload.expires_in ? new Date(Date.now() + payload.expires_in * 1000) : null,
    scopes: payload.scope ?? null,
    accountEmail: profile.email ?? null,
    externalAccountId: profile.id ?? null,
    metadata: { connectedById: state.userId }
  });

  return state.instituteId;
}

async function getGoogleAccessToken(instituteId: string) {
  const account = await prisma.integrationAccount.findUnique({
    where: { instituteId_provider: { instituteId, provider: "GOOGLE" } }
  });

  if (!account?.connected) {
    throw new Error("Google Meet is not connected. Connect Google Calendar in Live Class settings.");
  }

  const currentToken = decryptIntegrationToken(account.accessToken);
  if (currentToken && account.tokenExpiresAt && account.tokenExpiresAt.getTime() > Date.now() + 60_000) {
    return currentToken;
  }

  const refreshToken = decryptIntegrationToken(account.refreshToken);
  if (!refreshToken) {
    throw new Error("Google connection needs to be refreshed. Reconnect Google Calendar in Live Class settings.");
  }

  const { clientId, clientSecret } = await getGoogleOAuthCredentials(instituteId);
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token"
    })
  });
  const payload = (await response.json().catch(() => ({}))) as { access_token?: string; expires_in?: number; error_description?: string };

  if (!response.ok || !payload.access_token) {
    throw new Error(payload.error_description ?? "Could not refresh Google access token.");
  }

  await upsertEncryptedIntegrationTokens({
    instituteId,
    provider: "GOOGLE",
    accessToken: payload.access_token,
    tokenExpiresAt: payload.expires_in ? new Date(Date.now() + payload.expires_in * 1000) : null
  });

  return payload.access_token;
}

async function createGoogleMeetMeeting(input: MeetingInput): Promise<CreatedMeeting> {
  const token = await getGoogleAccessToken(input.instituteId);
  const endTime = new Date(input.startTime.getTime() + input.durationMinutes * 60_000);
  const response = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      summary: input.title,
      description: input.description ?? undefined,
      start: { dateTime: input.startTime.toISOString() },
      end: { dateTime: endTime.toISOString() },
      conferenceData: {
        createRequest: {
          requestId: randomUUID(),
          conferenceSolutionKey: { type: "hangoutsMeet" }
        }
      }
    })
  });
  let payload = (await response.json().catch(() => ({}))) as Record<string, unknown>;

  if (!response.ok || typeof payload.id !== "string") {
    const message = readProviderError(payload, "Google Calendar event creation failed.");
    await prisma.integrationAccount.updateMany({
      where: { instituteId: input.instituteId, provider: "GOOGLE" },
      data: { lastError: message }
    });
    throw new Error(message);
  }

  let meetLink = readGoogleMeetLink(payload);
  if (!meetLink) {
    const poll = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(payload.id)}?conferenceDataVersion=1`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const pollPayload = (await poll.json().catch(() => ({}))) as Record<string, unknown>;
    if (poll.ok) payload = pollPayload;
    meetLink = readGoogleMeetLink(payload);
  }

  if (!meetLink) {
    throw new Error("Google created the calendar event, but the Meet link is not available yet. Open the event or retry shortly.");
  }

  return {
    provider: "GOOGLE_MEET",
    meetingUrl: meetLink,
    joinUrl: meetLink,
    calendarEventId: String(payload.id),
    providerResponse: payload as Prisma.InputJsonObject
  };
}

function readGoogleMeetLink(payload: Record<string, unknown>) {
  if (typeof payload.hangoutLink === "string") return payload.hangoutLink;
  const conferenceData = payload.conferenceData as { entryPoints?: Array<{ entryPointType?: string; uri?: string }> } | undefined;
  return conferenceData?.entryPoints?.find((entry) => entry.entryPointType === "video" && entry.uri)?.uri ?? null;
}

function readProviderError(payload: Record<string, unknown>, fallback: string) {
  const messages = new Set<string>();

  collectProviderError(payload, messages);

  if (!messages.size) return fallback;

  const detail = Array.from(messages).join(" ");
  return detail.toLowerCase().startsWith(fallback.toLowerCase()) ? detail : `${fallback} ${detail}`;
}

function collectProviderError(value: unknown, messages: Set<string>) {
  if (!value || typeof value !== "object") return;

  const record = value as Record<string, unknown>;
  for (const key of ["message", "error_description", "reason", "status"]) {
    const item = record[key];
    if (typeof item === "string" && item.trim()) {
      messages.add(item.trim());
    }
  }

  if (typeof record.error === "string" && record.error.trim()) {
    messages.add(record.error.trim());
  } else {
    collectProviderError(record.error, messages);
  }

  for (const key of ["errors", "details"]) {
    const items = record[key];
    if (Array.isArray(items)) {
      for (const item of items) collectProviderError(item, messages);
    }
  }
}
