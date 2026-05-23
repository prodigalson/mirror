import { redirect } from "next/navigation";
import Link from "next/link";
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
    <main className="min-h-screen flex flex-col bg-paper-100 text-paper-900 subtle-grain overflow-hidden">
      <header className="w-full px-6 py-8 flex justify-between items-center max-w-7xl mx-auto z-10">
        <Link
          href="/"
          className="flex items-center gap-2 font-serif text-2xl tracking-tight text-paper-900 italic font-medium"
        >
          <MirrorLogo />
          <span>Mirror</span>
        </Link>
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-paper-800/70">
          <a
            href="https://github.com/prodigalson/mirror"
            className="hover:text-paper-900 transition-colors"
            target="_blank"
            rel="noreferrer noopener"
          >
            GitHub
          </a>
          <Link href="/" className="hover:text-paper-900 transition-colors">
            Home
          </Link>
        </nav>
      </header>

      <section className="flex-1 flex items-center justify-center px-6 pt-8 pb-24">
        <div className="w-full max-w-sm">
          <div className="relative mx-auto mb-10 w-[120px] h-[204px] rounded-[1000px] shadow-2xl overflow-hidden bg-paper-200">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/reflect-mirror.png"
              alt="Elegant oval gold-framed mirror"
              className="w-full h-full object-cover rounded-[1000px]"
            />
            <div className="mirror-glare absolute inset-0 pointer-events-none" aria-hidden="true" />
          </div>

          <div className="text-center mb-10">
            <h1 className="font-serif text-5xl leading-[1.05] text-paper-900 mb-4">
              Create your space.
            </h1>
            <p className="text-base text-paper-800/60 font-light leading-relaxed">
              Pick a name and password. If the name is new, Mirror creates your account.
              If it already exists, we&apos;ll sign you in.
            </p>
          </div>

          <div className="p-6 rounded-lg bg-paper-50/60 border border-paper-300/60 shadow-mirror backdrop-blur-sm">
            <LoginForm nextPath={next} />
          </div>

          <p className="mt-8 text-center text-xs text-paper-800/40">
            Your sessions stay private to you. One password, one you.
          </p>
        </div>
      </section>
    </main>
  );
}

function MirrorLogo() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.4" />
      <line x1="12" y1="3" x2="12" y2="21" stroke="currentColor" strokeWidth="1" opacity="0.5" />
      <circle cx="8" cy="12" r="1.6" fill="currentColor" />
      <circle cx="16" cy="12" r="1.6" fill="currentColor" />
    </svg>
  );
}
