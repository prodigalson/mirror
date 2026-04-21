import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import LoginForm from "./form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const session = await getSession();
  const { next } = await searchParams;
  if (session) redirect(next || "/app");

  return (
    <main className="flex-1 flex items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <h1 className="font-serif text-3xl text-ink mb-2">Welcome back.</h1>
          <p className="text-sm text-ink-muted">
            Your sessions stay private to you. One password, one you.
          </p>
        </div>
        <LoginForm nextPath={next} />
        <p className="mt-8 text-center text-xs text-ink-faint">
          First time? Pick a name and password. We&apos;ll create your space.
        </p>
      </div>
    </main>
  );
}
