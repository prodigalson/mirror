"use client";

import { useRouter } from "next/navigation";

export default function SignOut() {
  const router = useRouter();
  async function onClick() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-sm text-ink-faint hover:text-ink transition"
    >
      Sign out
    </button>
  );
}
