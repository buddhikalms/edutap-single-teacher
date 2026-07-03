import Link from "next/link";
import type React from "react";
import { CalendarClock, CheckCircle2, CopyCheck, Link2, RefreshCw, Settings2, ShieldCheck, TestTube2, Unplug, Video, XCircle } from "lucide-react";
import {
  disconnectGoogleAction,
  disconnectZoomAction,
  refreshZoomTokenAction,
  saveGoogleOAuthSettings,
  saveZoomSettings,
  testZoomConnectionAction
} from "@/app/(dashboard)/live-classes/settings/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { prisma } from "@/lib/prisma";
import { getTenantContext } from "@/lib/session";

function credentialMap(credentials: Array<{ name: string; lastFour: string | null }>) {
  return new Map(credentials.map((credential) => [credential.name, credential.lastFour]));
}

function statusBadge(connected: boolean) {
  return connected ? <Badge variant="success">Connected</Badge> : <Badge variant="outline">Not connected</Badge>;
}

function formatDate(date?: Date | null) {
  return date ? date.toLocaleString() : "Not available";
}

export default async function LiveClassSettingsPage() {
  const { instituteId, userId, role } = await getTenantContext();
  const [google, credentials, zoomConnection, zoomSettings, zoomStats] = await Promise.all([
    prisma.integrationAccount.findUnique({ where: { instituteId_provider: { instituteId, provider: "GOOGLE" } } }),
    prisma.providerCredential.findMany({ where: { instituteId, provider: "GOOGLE" }, select: { provider: true, name: true, lastFour: true } }),
    prisma.zoomConnection.findUnique({ where: { userId } }),
    prisma.zoomMeetingSettings.upsert({ where: { userId }, create: { userId }, update: {} }),
    prisma.zoomMeeting.groupBy({
      by: ["status"],
      where: { userId },
      _count: { _all: true }
    })
  ]);

  const googleCredentials = credentialMap(credentials);
  const canManageGoogle = ["SUPER_ADMIN", "INSTITUTE_ADMIN", "BRANCH_ADMIN"].includes(role);
  const zoomConnected = Boolean(zoomConnection);
  const meetingCount = zoomStats.reduce((sum, item) => sum + item._count._all, 0);
  const importedCount = await prisma.zoomMeeting.count({ where: { userId, recordingImported: true } });

  return (
    <div className="space-y-6">
      <section className="glass-panel rounded-2xl p-6 sm:p-8">
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
          <div>
            <Badge variant="secondary">Live class settings</Badge>
            <h2 className="mt-4 text-3xl font-semibold tracking-normal sm:text-4xl">Connected Meeting Accounts</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              Connect your own Zoom account once. EduTap creates rooms, refreshes tokens, and keeps credentials off the frontend.
            </p>
          </div>
          <Button asChild variant="outline">
            <Link href="/live-classes">Back to live classes</Link>
          </Button>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <Metric icon={Video} label="Zoom meetings" value={String(meetingCount)} />
        <Metric icon={CopyCheck} label="Recordings imported" value={String(importedCount)} />
        <Metric icon={ShieldCheck} label="Token handling" value="Encrypted" />
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
        <Card className="glass-panel overflow-hidden">
          <CardHeader className="border-b bg-white/60">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <CardTitle className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-[#2d8cff] text-white">
                  <Video className="h-6 w-6" />
                </span>
                Zoom
              </CardTitle>
              {statusBadge(zoomConnected)}
            </div>
          </CardHeader>
          <CardContent className="space-y-5 p-6">
            <div className="rounded-xl border bg-white/80 p-4">
              <div className="flex items-start gap-3">
                {zoomConnected ? <CheckCircle2 className="mt-1 h-5 w-5 text-emerald-600" /> : <XCircle className="mt-1 h-5 w-5 text-muted-foreground" />}
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{zoomConnection?.displayName ?? "No Zoom account connected"}</p>
                  <p className="truncate text-sm text-muted-foreground">{zoomConnection?.email ?? "Connect Zoom to create meetings without copying links."}</p>
                </div>
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <Info label="Connection Status" value={zoomConnected ? "Connected" : "Not Connected"} />
                <Info label="Zoom account email" value={zoomConnection?.email ?? "Not available"} />
                <Info label="Zoom account name" value={zoomConnection?.displayName ?? "Not available"} />
                <Info label="Connected date" value={formatDate(zoomConnection?.connectedAt)} />
                <Info label="Last sync" value={formatDate(zoomConnection?.lastSyncAt ?? zoomConnection?.updatedAt)} />
                <Info label="Token expiry" value={formatDate(zoomConnection?.expiresAt)} />
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button asChild>
                <a href="/api/integrations/zoom/connect">
                  <Link2 className="h-4 w-4" />
                  {zoomConnected ? "Reconnect Zoom" : "Connect Zoom"}
                </a>
              </Button>
              <form action={disconnectZoomAction}>
                <Button type="submit" variant="outline" disabled={!zoomConnected}>
                  <Unplug className="h-4 w-4" />
                  Disconnect Zoom
                </Button>
              </form>
              <form action={refreshZoomTokenAction}>
                <Button type="submit" variant="outline" disabled={!zoomConnected}>
                  <RefreshCw className="h-4 w-4" />
                  Refresh Token
                </Button>
              </form>
              <form action={testZoomConnectionAction}>
                <Button type="submit" variant="outline" disabled={!zoomConnected}>
                  <TestTube2 className="h-4 w-4" />
                  Test Connection
                </Button>
              </form>
            </div>

            <form action={saveZoomSettings} className="space-y-4 rounded-xl border bg-white/75 p-4">
              <div className="flex items-center gap-2">
                <Settings2 className="h-5 w-5 text-primary" />
                <h3 className="font-semibold">Default meeting settings</h3>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Default meeting duration" htmlFor="defaultDurationMinutes">
                  <Input id="defaultDurationMinutes" name="defaultDurationMinutes" type="number" min={5} defaultValue={zoomSettings.defaultDurationMinutes} />
                </Field>
                <Field label="Default recording" htmlFor="defaultRecording">
                  <Select id="defaultRecording" name="defaultRecording" defaultValue={zoomSettings.defaultRecording}>
                    <option value="none">None</option>
                    <option value="local">Local</option>
                    <option value="cloud">Cloud</option>
                  </Select>
                </Field>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Toggle name="defaultWaitingRoom" label="Waiting room" checked={zoomSettings.defaultWaitingRoom} />
                <Toggle name="defaultPasscodeGeneration" label="Passcode generation" checked={zoomSettings.defaultPasscodeGeneration} />
                <Toggle name="defaultJoinBeforeHost" label="Join before host" checked={zoomSettings.defaultJoinBeforeHost} />
                <Toggle name="defaultMuteParticipants" label="Mute participants" checked={zoomSettings.defaultMuteParticipants} />
                <Toggle name="defaultHostVideo" label="Host video" checked={zoomSettings.defaultHostVideo} />
                <Toggle name="defaultParticipantVideo" label="Participant video" checked={zoomSettings.defaultParticipantVideo} />
              </div>
              <Button type="submit" variant="outline">Save Zoom defaults</Button>
            </form>
          </CardContent>
        </Card>

        <Card className="glass-panel">
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <CardTitle className="flex items-center gap-2">
                <CalendarClock className="h-5 w-5 text-primary" />
                Google Meet
              </CardTitle>
              {statusBadge(Boolean(google?.connected))}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <form action={saveGoogleOAuthSettings} className="space-y-4">
              <Field label={`OAuth Client ID${googleCredentials.get("clientId") ? ` ending ${googleCredentials.get("clientId")}` : ""}`} htmlFor="googleClientId">
                <Input id="googleClientId" name="clientId" placeholder="Google OAuth Client ID" disabled={!canManageGoogle} />
              </Field>
              <Field label={googleCredentials.get("clientSecret") ? `OAuth Client Secret ending ${googleCredentials.get("clientSecret")}` : "OAuth Client Secret"} htmlFor="googleClientSecret">
                <Input id="googleClientSecret" name="clientSecret" type="password" placeholder="Google OAuth Client Secret" disabled={!canManageGoogle} />
              </Field>
              <Button type="submit" className="w-full" disabled={!canManageGoogle}>
                Save Google OAuth settings
              </Button>
            </form>

            <div className="rounded-xl border bg-white/70 p-4">
              <div className="flex items-center gap-2">
                {google?.connected ? <CheckCircle2 className="h-5 w-5 text-emerald-600" /> : <XCircle className="h-5 w-5 text-muted-foreground" />}
                <div>
                  <p className="font-semibold">{google?.accountEmail ?? "No Google account connected"}</p>
                  <p className="text-xs text-muted-foreground">Redirect URI: /api/integrations/google/callback</p>
                </div>
              </div>
              {google?.lastError ? <p className="mt-3 text-sm text-destructive">{google.lastError}</p> : null}
              <div className="mt-4 flex flex-wrap gap-2">
                <Button asChild disabled={!canManageGoogle}>
                  <Link href="/api/integrations/google/connect">
                    <Link2 className="h-4 w-4" />
                    Connect Google
                  </Link>
                </Button>
                <form action={disconnectGoogleAction}>
                  <Button type="submit" variant="outline" disabled={!canManageGoogle || !google?.connected}>
                    Disconnect
                  </Button>
                </form>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function Metric({ icon: Icon, label, value }: { icon: typeof Video; label: string; value: string }) {
  return (
    <Card className="glass-panel">
      <CardContent className="flex items-center gap-4 p-5">
        <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary text-white">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="font-semibold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-white/70 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 truncate font-semibold">{value}</p>
    </div>
  );
}

function Toggle({ name, label, checked }: { name: string; label: string; checked: boolean }) {
  return (
    <label className="flex min-h-11 items-center gap-3 rounded-lg border bg-white/80 px-3 text-sm">
      <input type="checkbox" name={name} defaultChecked={checked} className="h-4 w-4" />
      <span className="font-medium">{label}</span>
    </label>
  );
}

function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  );
}
