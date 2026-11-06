"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, Lock } from "lucide-react";
import { buttonClass } from "@/components/ui";

export function AdminLoginForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <form
      className="card mt-6 space-y-4 p-6"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError("");
        const r = await fetch("/api/admin/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password }) }).catch(() => null);
        setBusy(false);
        if (r?.ok) router.replace("/admin/photo");
        else setError((await r?.json().catch(() => null))?.error ?? "Sign-in failed.");
      }}
    >
      <label htmlFor="admin-password" className="block text-sm font-medium text-fg">
        Password
      </label>
      <input
        id="admin-password"
        type="password"
        autoComplete="current-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="w-full rounded-xl border border-line bg-surface px-4 py-3 text-sm text-fg outline-none focus:border-line-strong"
        required
      />
      {error && (
        <p role="alert" className="text-sm text-rose">
          {error}
        </p>
      )}
      <button type="submit" disabled={busy || !password} className={buttonClass("gradient", "w-full")}>
        {busy ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : <Lock className="size-4" aria-hidden />} Sign in
      </button>
    </form>
  );
}
