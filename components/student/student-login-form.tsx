"use client";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { GraduationCap, Loader2, LogIn } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InstallAppButton } from "@/components/pwa/install-app-button";

export function StudentLoginForm() {
  const router = useRouter(); const [loading,setLoading]=useState(false);
  async function submit(e:React.FormEvent<HTMLFormElement>){e.preventDefault();setLoading(true);const data=new FormData(e.currentTarget);const result=await signIn("credentials",{email:String(data.get("identifier")),password:String(data.get("password")),redirect:false,callbackUrl:"/student/dashboard"});setLoading(false);if(result?.error){toast.error("Login failed",{description:result.error === "CredentialsSignin" ? "Check your Student ID, mobile/email, and password." : result.error});return}router.push("/student/dashboard");router.refresh()}
  return <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(20,184,166,.2),_transparent_35%),#f8fafc] p-4"><div className="mx-auto flex min-h-screen max-w-md items-center"><div className="w-full space-y-5"><div className="text-center"><span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-white"><GraduationCap/></span><h1 className="mt-4 text-3xl font-semibold">Student Portal</h1><p className="mt-2 text-sm text-muted-foreground">Learn from any phone, tablet, or computer.</p></div><form onSubmit={submit} className="glass-panel space-y-5 rounded-2xl p-6"><div className="space-y-2"><Label htmlFor="identifier">Student ID, mobile, or email</Label><Input id="identifier" name="identifier" autoComplete="username" required/></div><div className="space-y-2"><Label htmlFor="password">Password</Label><Input id="password" name="password" type="password" autoComplete="current-password" required/></div><Button className="w-full" size="lg" disabled={loading}>{loading?<Loader2 className="animate-spin"/>:<LogIn/>}Sign in</Button></form><InstallAppButton/></div></div></main>
}
