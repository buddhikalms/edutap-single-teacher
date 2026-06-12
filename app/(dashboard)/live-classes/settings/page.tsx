import Link from "next/link";
import { CalendarClock, CheckCircle2, KeyRound, Link2, ShieldCheck, TestTube2, Video, XCircle } from "lucide-react";
import { disconnectGoogleAction, saveGoogleOAuthSettings, saveZoomSettings, testZoomConnectionAction } from "@/app/(dashboard)/live-classes/settings/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { prisma } from "@/lib/prisma";
import { getTenantContext } from "@/lib/session";

function credentialMap(credentials: Array<{ name: string; lastFour: string | null }>) {
  return new Map(credentials.map((credential) => [credential.name, credential.lastFour]));
}

function statusBadge(connected: boolean) {
  return connected ? <Badge variant="success">Connected</Badge> : <Badge variant="outline">Not connected</Badge>;
}

function integrationMetadata(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

export default async function LiveClassSettingsPage() {
  const { instituteId, role } = await getTenantContext();
  const [accounts, credentials] = await Promise.all([
    prisma.integrationAccount.findMany({ where: { instituteId } }),
    prisma.providerCredential.findMany({ where: { instituteId }, select: { provider: true, name: true, lastFour: true } })
  ]);

  const zoom = accounts.find((account) => account.provider === "ZOOM");
  const google = accounts.find((account) => account.provider === "GOOGLE");
  const zoomMetadata = integrationMetadata(zoom?.metadata);
  const zoomCredentials = credentialMap(credentials.filter((credential) => credential.provider === "ZOOM"));
  const googleCredentials = credentialMap(credentials.filter((credential) => credential.provider === "GOOGLE"));
  const canManage = ["SUPER_ADMIN", "INSTITUTE_ADMIN", "BRANCH_ADMIN"].includes(role);

  return (
    <div className="space-y-6">
      <section className="glass-panel rounded-2xl p-6 sm:p-8">
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
          <div>
            <Badge variant="secondary">Provider settings</Badge>
            <h2 className="mt-4 text-3xl font-semibold tracking-normal sm:text-4xl">Live Class Integrations</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              Connect Zoom Server-to-Server OAuth and Google Calendar so auto-created live rooms can be generated securely on the server.
            </p>
          </div>
          <Button asChild variant="outline">
            <Link href="/live-classes">Back to live classes</Link>
          </Button>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <StatusCard icon={Video} label="Zoom auto meetings" connected={Boolean(zoom?.connected)} />
        <StatusCard icon={CalendarClock} label="Google Meet auto meetings" connected={Boolean(google?.connected)} />
        <StatusCard icon={ShieldCheck} label="Encrypted credentials" connected={credentials.length > 0} />
      </section>

      {!canManage ? (
        <Card className="glass-panel">
          <CardContent className="p-6 text-sm text-muted-foreground">Only institute admins and branch admins can update provider credentials.</CardContent>
        </Card>
      ) : null}

      <section className="grid gap-5 xl:grid-cols-2">
        <Card className="glass-panel">
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <CardTitle className="flex items-center gap-2">
                <Video className="h-5 w-5 text-primary" />
                Zoom Server-to-Server OAuth
              </CardTitle>
              {statusBadge(Boolean(zoom?.connected))}
            </div>
          </CardHeader>
          <CardContent>
            <form action={saveZoomSettings} className="space-y-4">
              <Field label={`Account ID${zoomCredentials.get("accountId") ? ` ending ${zoomCredentials.get("accountId")}` : ""}`} htmlFor="zoomAccountId">
                <Input id="zoomAccountId" name="accountId" placeholder="Zoom Account ID" disabled={!canManage} />
              </Field>
              <Field label={`Client ID${zoomCredentials.get("clientId") ? ` ending ${zoomCredentials.get("clientId")}` : ""}`} htmlFor="zoomClientId">
                <Input id="zoomClientId" name="clientId" placeholder="Zoom Client ID" disabled={!canManage} />
              </Field>
              <Field label={zoomCredentials.get("clientSecret") ? `Client Secret ending ${zoomCredentials.get("clientSecret")}` : "Client Secret"} htmlFor="zoomClientSecret">
                <Input id="zoomClientSecret" name="clientSecret" type="password" placeholder="Zoom Client Secret" disabled={!canManage} />
              </Field>
              {zoom?.lastError ? <p className="text-sm text-destructive">{zoom.lastError}</p> : null}
              {zoom?.accountEmail || zoomMetadata.lastTestedAt ? (
                <div className="rounded-xl border bg-white/70 p-4 text-sm">
                  <p className="font-semibold">{zoom?.accountEmail ?? "Zoom account verified"}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Last tested: {typeof zoomMetadata.lastTestedAt === "string" ? new Date(zoomMetadata.lastTestedAt).toLocaleString() : "Not tested yet"}
                  </p>
                </div>
              ) : null}
              <Button type="submit" className="w-full" disabled={!canManage}>
                <KeyRound className="h-4 w-4" />
                Save Zoom settings
              </Button>
            </form>
            <form action={testZoomConnectionAction} className="mt-3">
              <Button type="submit" className="w-full" variant="outline" disabled={!canManage || !zoomCredentials.get("accountId") || !zoomCredentials.get("clientId") || !zoomCredentials.get("clientSecret")}>
                <TestTube2 className="h-4 w-4" />
                Test Zoom connection
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="glass-panel">
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <CardTitle className="flex items-center gap-2">
                <CalendarClock className="h-5 w-5 text-primary" />
                Google Calendar + Meet
              </CardTitle>
              {statusBadge(Boolean(google?.connected))}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <form action={saveGoogleOAuthSettings} className="space-y-4">
              <Field label={`OAuth Client ID${googleCredentials.get("clientId") ? ` ending ${googleCredentials.get("clientId")}` : ""}`} htmlFor="googleClientId">
                <Input id="googleClientId" name="clientId" placeholder="Google OAuth Client ID" disabled={!canManage} />
              </Field>
              <Field label={googleCredentials.get("clientSecret") ? `OAuth Client Secret ending ${googleCredentials.get("clientSecret")}` : "OAuth Client Secret"} htmlFor="googleClientSecret">
                <Input id="googleClientSecret" name="clientSecret" type="password" placeholder="Google OAuth Client Secret" disabled={!canManage} />
              </Field>
              <Button type="submit" className="w-full" disabled={!canManage}>
                <KeyRound className="h-4 w-4" />
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
                <Button asChild disabled={!canManage}>
                  <Link href="/api/integrations/google/connect">
                    <Link2 className="h-4 w-4" />
                    Connect Google
                  </Link>
                </Button>
                <form action={disconnectGoogleAction}>
                  <Button type="submit" variant="outline" disabled={!canManage || !google?.connected}>
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

function StatusCard({ icon: Icon, label, connected }: { icon: typeof Video; label: string; connected: boolean }) {
  return (
    <Card className="glass-panel">
      <CardContent className="flex items-center gap-4 p-5">
        <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary text-white">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="font-semibold">{connected ? "Ready" : "Setup required"}</p>
        </div>
      </CardContent>
    </Card>
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
