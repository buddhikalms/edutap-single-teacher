"use client";

import { useActionState, useEffect, useState } from "react";
import { signIn } from "next-auth/react";
import { ArrowLeft, ArrowRight, Check, Loader2 } from "lucide-react";
import { completeSetup, type SetupState } from "@/app/setup/actions";
import { ImageUploadInput } from "@/components/forms/image-upload-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const initialState: SetupState = { ok: false, message: "" };
const steps = ["Teacher profile", "Branding", "Location", "Login", "Finish"];

export function SetupWizard() {
  const [step, setStep] = useState(0);
  const [password, setPassword] = useState("");
  const [state, action, pending] = useActionState(completeSetup, initialState);

  useEffect(() => {
    if (!state.ok || !state.email) return;

    void signIn("credentials", {
      email: state.email,
      password,
      callbackUrl: "/dashboard"
    });
  }, [password, state]);

  return (
    <form action={action} className="mx-auto w-full max-w-3xl">
      <div className="mb-8 grid grid-cols-5 gap-2">
        {steps.map((label, index) => (
          <div key={label}>
            <div className={`h-1.5 rounded-full ${index <= step ? "bg-primary" : "bg-muted"}`} />
            <p className="mt-2 hidden text-xs text-muted-foreground sm:block">{label}</p>
          </div>
        ))}
      </div>

      <div className="glass-panel rounded-2xl p-6 shadow-luxury sm:p-9">
        <p className="text-sm font-semibold text-primary">Step {step + 1} of 5</p>
        <h1 className="mt-2 text-3xl font-semibold">{steps[step]}</h1>

        <div className="mt-7">
          <Step visible={step === 0}>
            <Grid>
              <Field label="Teacher name *" htmlFor="name"><Input id="name" name="name" required /></Field>
              <Field label="Subject / specialization *" htmlFor="subject"><Input id="subject" name="subject" required /></Field>
              <Field label="Phone *" htmlFor="phone"><Input id="phone" name="phone" required /></Field>
              <Field label="Profile photo" htmlFor="photoUrl"><ImageUploadInput name="photoUrl" /></Field>
            </Grid>
            <Field label="Short bio" htmlFor="bio"><Textarea id="bio" name="bio" rows={5} /></Field>
          </Step>

          <Step visible={step === 1}>
            <Grid>
              <Field label="Brand / class name *" htmlFor="brandName"><Input id="brandName" name="brandName" required /></Field>
              <Field label="Logo" htmlFor="logoUrl"><ImageUploadInput name="logoUrl" /></Field>
              <Field label="Brand colour" htmlFor="themeColor"><Input id="themeColor" name="themeColor" type="color" defaultValue="#0f766e" /></Field>
              <Field label="Currency" htmlFor="currency">
                <Select id="currency" name="currency" defaultValue="LKR">
                  <option value="LKR">LKR</option>
                  <option value="USD">USD</option>
                  <option value="INR">INR</option>
                  <option value="GBP">GBP</option>
                  <option value="AUD">AUD</option>
                </Select>
              </Field>
            </Grid>
          </Step>

          <Step visible={step === 2}>
            <Field label="Default class location *" htmlFor="locationName"><Input id="locationName" name="locationName" placeholder="Main classroom" required /></Field>
            <Field label="Address" htmlFor="locationAddress"><Textarea id="locationAddress" name="locationAddress" rows={4} /></Field>
          </Step>

          <Step visible={step === 3}>
            <Field label="Owner email *" htmlFor="email"><Input id="email" name="email" type="email" autoComplete="username" required /></Field>
            <Grid>
              <Field label="Password *" htmlFor="password"><Input id="password" name="password" type="password" minLength={8} autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} required /></Field>
              <Field label="Confirm password *" htmlFor="confirmPassword"><Input id="confirmPassword" name="confirmPassword" type="password" minLength={8} autoComplete="new-password" required /></Field>
            </Grid>
          </Step>

          <Step visible={step === 4}>
            <div className="rounded-2xl border bg-emerald-50 p-6">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-600 text-white"><Check className="h-5 w-5" /></div>
              <h2 className="mt-4 text-xl font-semibold">Ready to create your workspace</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                EduTap will create your owner login, teacher profile, default location, settings, and grades from Pre School to Grade 11.
              </p>
            </div>
          </Step>
        </div>

        {state.message ? <p className={`mt-5 text-sm ${state.ok ? "text-emerald-700" : "text-destructive"}`}>{state.message}</p> : null}

        <div className="mt-8 flex items-center justify-between border-t pt-5">
          <Button type="button" variant="outline" onClick={() => setStep((value) => Math.max(0, value - 1))} disabled={step === 0 || pending}>
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>
          {step < 4 ? (
            <Button type="button" onClick={() => setStep((value) => Math.min(4, value + 1))}>
              Continue <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button type="submit" disabled={pending}>
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              Finish setup
            </Button>
          )}
        </div>
      </div>
    </form>
  );
}

function Step({ visible, children }: { visible: boolean; children: React.ReactNode }) {
  return <div className={visible ? "space-y-5" : "hidden"}>{children}</div>;
}

function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-5 sm:grid-cols-2">{children}</div>;
}

function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: React.ReactNode }) {
  return <div className="space-y-2"><Label htmlFor={htmlFor}>{label}</Label>{children}</div>;
}
