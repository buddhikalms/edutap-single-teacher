"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { CheckCircle2, KeyRound, Loader2, QrCode, Radio, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { QrCodeScanner } from "@/components/cards/camera-qr-scanner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type ActivationStudent = {
  name: string;
  admissionNo: string;
  institute: string;
  branch: string;
};

type ActivationStartResponse = {
  ok: boolean;
  setupRequired?: boolean;
  activationToken?: string;
  message: string;
  student?: ActivationStudent;
};

type ActivationCompleteResponse = {
  ok: boolean;
  message: string;
  identifier?: string;
};

type WebNfcReadingEvent = Event & { serialNumber?: string };
type WebNfcReader = {
  scan: (options?: { signal?: AbortSignal }) => Promise<void>;
  onreading: ((event: WebNfcReadingEvent) => void) | null;
  onreadingerror: (() => void) | null;
};
type WebNfcWindow = Window & { NDEFReader?: new () => WebNfcReader };

export function StudentFirstLoginForm() {
  const router = useRouter();
  const [mode, setMode] = useState<"password" | "setup">("password");
  const [step, setStep] = useState(1);
  const [qrOpen, setQrOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [nfcListening, setNfcListening] = useState(false);
  const [student, setStudent] = useState<ActivationStudent | null>(null);
  const [activationToken, setActivationToken] = useState("");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  async function startActivation(method: "QR" | "NFC", value: string) {
    setBusy(true);
    const response = await fetch("/api/student-auth/credential/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(method === "NFC" ? { method, nfcUid: value } : { method, qrToken: value })
    });
    const payload = (await response.json().catch(() => null)) as ActivationStartResponse | null;
    setBusy(false);

    if (!response.ok || !payload?.ok) {
      toast.error(payload?.message ?? "Could not verify this student card.");
      return;
    }

    if (!payload.setupRequired) {
      toast.info(payload.message);
      return;
    }

    setStudent(payload.student ?? null);
    setActivationToken(payload.activationToken ?? "");
    setMode("setup");
    setStep(1);
  }

  async function scanNfc() {
    const nfcWindow = window as WebNfcWindow;
    if (!nfcWindow.NDEFReader) {
      toast.error("Web NFC is not available in this browser. Use Chrome on Android or scan QR.");
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 20000);
    setNfcListening(true);

    try {
      const reader = new nfcWindow.NDEFReader();
      await reader.scan({ signal: controller.signal });
      toast.info("Hold the student card near this device.");
      reader.onreading = (event) => {
        window.clearTimeout(timeout);
        controller.abort();
        setNfcListening(false);
        if (!event.serialNumber) {
          toast.error("The card was read, but no NFC UID was available.");
          return;
        }
        void startActivation("NFC", event.serialNumber);
      };
      reader.onreadingerror = () => {
        window.clearTimeout(timeout);
        controller.abort();
        setNfcListening(false);
        toast.error("Could not read that NFC card.");
      };
    } catch (error) {
      window.clearTimeout(timeout);
      setNfcListening(false);
      toast.error(error instanceof Error ? error.message : "Could not start NFC.");
    }
  }

  async function passwordLogin() {
    setBusy(true);
    const result = await signIn("credentials", {
      email: identifier,
      password,
      redirect: false,
      callbackUrl: "/student/dashboard"
    });
    setBusy(false);

    if (result?.error) {
      toast.error(result.error === "CredentialsSignin" ? "Invalid student credentials." : result.error);
      return;
    }

    router.push(result?.url ?? "/student/dashboard");
    router.refresh();
  }

  async function completeSetup(linkGoogle = false) {
    setBusy(true);
    const response = await fetch("/api/student-auth/activation/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ activationToken, password: newPassword, confirmPassword })
    });
    const payload = (await response.json().catch(() => null)) as ActivationCompleteResponse | null;
    setBusy(false);

    if (!response.ok || !payload?.ok || !payload.identifier) {
      toast.error(payload?.message ?? "Could not complete setup.");
      return;
    }

    toast.success(payload.message);
    if (linkGoogle) {
      await signIn("google", { callbackUrl: "/student/dashboard" });
      return;
    }

    const result = await signIn("credentials", {
      email: payload.identifier,
      password: newPassword,
      redirect: false,
      callbackUrl: "/student/dashboard"
    });

    if (result?.error) {
      setStep(5);
      return;
    }

    router.push(result?.url ?? "/student/dashboard");
    router.refresh();
  }

  return (
    <>
      <div>
        <div className="mb-6">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-white shadow-glow">
            <Sparkles className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-semibold tracking-normal">Student login</h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">Activate a new card account or sign in with your password.</p>
        </div>

        {mode === "setup" ? (
          <div className="space-y-5">
            <div className="grid grid-cols-5 gap-2">
              {[1, 2, 3, 4, 5].map((item) => (
                <span key={item} className={`h-1.5 rounded-full ${item <= step ? "bg-primary" : "bg-muted"}`} />
              ))}
            </div>

            {step === 1 ? (
              <WizardPanel title={`Welcome${student ? `, ${student.name}` : ""}`} text={student ? `${student.institute} - ${student.branch} - ${student.admissionNo}` : "Your card is verified."}>
                <Button className="w-full" onClick={() => setStep(2)}>Create password</Button>
              </WizardPanel>
            ) : null}

            {step === 2 ? (
              <WizardPanel title="Create password" text="Use at least 8 characters. Keep it private and memorable.">
                <Label htmlFor="new-password">Password</Label>
                <Input id="new-password" type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} autoComplete="new-password" />
                <Button className="w-full" onClick={() => setStep(3)} disabled={newPassword.length < 8}>Continue</Button>
              </WizardPanel>
            ) : null}

            {step === 3 ? (
              <WizardPanel title="Confirm password" text="Enter the same password one more time.">
                <Label htmlFor="confirm-password">Confirm password</Label>
                <Input id="confirm-password" type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} autoComplete="new-password" />
                <Button className="w-full" onClick={() => setStep(4)} disabled={confirmPassword !== newPassword}>Continue</Button>
              </WizardPanel>
            ) : null}

            {step === 4 ? (
              <WizardPanel title="Link Google account" text="Optional. You can link later from your profile if you prefer.">
                <Button className="w-full" onClick={() => completeSetup(false)} disabled={busy}>
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                  Finish setup
                </Button>
                <Button type="button" variant="outline" className="w-full" onClick={() => completeSetup(true)} disabled={busy}>
                  Finish and link Google
                </Button>
              </WizardPanel>
            ) : null}

            {step === 5 ? (
              <WizardPanel title="Setup complete" text="Your password is ready. Sign in with your new password.">
                <Button className="w-full" onClick={() => setMode("password")}>Go to password login</Button>
              </WizardPanel>
            ) : null}
          </div>
        ) : (
          <div className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-2">
              <Button type="button" size="lg" variant="outline" onClick={() => setQrOpen(true)} disabled={busy}>
                <QrCode className="h-4 w-4" />
                Scan QR
              </Button>
              <Button type="button" size="lg" variant="outline" onClick={scanNfc} disabled={busy || nfcListening}>
                {nfcListening ? <Loader2 className="h-4 w-4 animate-spin" /> : <Radio className="h-4 w-4" />}
                Tap NFC
              </Button>
            </div>

            <div className="relative text-center text-xs text-muted-foreground before:absolute before:left-0 before:right-0 before:top-1/2 before:border-t">
              <span className="relative bg-white px-3">or password login</span>
            </div>

            <div className="space-y-2">
              <Label htmlFor="student-id">Admission number, email, or mobile</Label>
              <Input id="student-id" value={identifier} onChange={(event) => setIdentifier(event.target.value)} autoComplete="username" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="student-password">Password</Label>
              <Input id="student-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" />
            </div>
            <Button className="w-full" size="lg" onClick={passwordLogin} disabled={busy}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
              Sign in
            </Button>
          </div>
        )}
      </div>
      <QrCodeScanner open={qrOpen} onClose={() => setQrOpen(false)} onScan={(value) => {
        setQrOpen(false);
        void startActivation("QR", value);
      }} />
    </>
  );
}

function WizardPanel({ title, text, children }: { title: string; text: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border bg-white p-5">
      <h2 className="text-xl font-semibold">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{text}</p>
      <div className="mt-5 space-y-3">{children}</div>
    </div>
  );
}
