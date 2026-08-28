import { PublicShell } from "@/components/public/site-shell";

export default async function MarketingLayout({ children }: { children: React.ReactNode }) {
  return <PublicShell>{children}</PublicShell>;
}
