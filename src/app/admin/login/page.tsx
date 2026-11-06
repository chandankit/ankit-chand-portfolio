import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { ADMIN_COOKIE, adminConfigured, verifySession } from "@/lib/admin-auth";
import { Container } from "@/components/ui";
import { AdminLoginForm } from "@/components/admin/login-form";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Admin sign-in", robots: { index: false, follow: false } };

export default async function AdminLogin() {
  if (verifySession((await cookies()).get(ADMIN_COOKIE)?.value)) redirect("/admin/photo");
  return (
    <Container className="max-w-md pb-20 pt-32">
      <h1 className="font-display text-2xl font-semibold text-fg">Admin sign-in</h1>
      {adminConfigured() ? (
        <>
          <p className="mt-2 text-sm text-muted">For the site owner only. Visitors don&apos;t need an account for anything on this portfolio.</p>
          <AdminLoginForm />
        </>
      ) : (
        <p className="card mt-6 p-5 text-sm text-muted">
          Admin features are disabled. To enable the Photo Studio, set <code className="font-mono text-fg">ADMIN_PASSWORD</code> and a 32+ character <code className="font-mono text-fg">ADMIN_SESSION_SECRET</code> in the hosting environment, then redeploy.
        </p>
      )}
    </Container>
  );
}
