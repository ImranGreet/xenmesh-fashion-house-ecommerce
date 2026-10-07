"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

const apiUrl =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const response = await fetch(`${apiUrl}/auth/sign-in`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        setError(
          response.status === 401
            ? "The email or password you entered is incorrect."
            : "Unable to sign in right now. Please try again.",
        );
        return;
      }

      router.replace("/admin");
      router.refresh();
    } catch {
      setError("Cannot reach the authentication server. Check that the API is running.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="grid min-h-screen lg:grid-cols-[1fr_1fr]">
      <section className="relative hidden overflow-hidden bg-[#18352d] p-12 text-[#f4f0e7] lg:flex lg:flex-col lg:justify-between">
        <div className="absolute -right-28 -top-28 h-[32rem] w-[32rem] rounded-full border border-white/10" />
        <div className="absolute -right-12 -top-12 h-[24rem] w-[24rem] rounded-full border border-white/10" />
        <div className="relative">
          <p className="text-xs font-semibold uppercase tracking-[0.34em]">
            Xenmesh
          </p>
          <p className="mt-2 text-[10px] uppercase tracking-[0.28em] text-white/55">
            Fashion House
          </p>
        </div>
        <div className="relative max-w-xl pb-10">
          <p className="mb-6 text-xs uppercase tracking-[0.3em] text-[#d5b98c]">
            Admin workspace
          </p>
          <h1 className="font-serif text-6xl leading-[1.08] tracking-tight xl:text-7xl">
            Thoughtful style.
            <br />
            Beautifully managed.
          </h1>
          <p className="mt-7 max-w-md text-sm leading-7 text-white/65">
            Sign in to manage your store, collections, and the details that
            make every order feel considered.
          </p>
        </div>
        <p className="relative text-xs text-white/45">
          A considered space for the everyday extraordinary.
        </p>
      </section>

      <section className="flex items-center justify-center px-6 py-14 sm:px-10">
        <div className="w-full max-w-md">
          <div className="mb-12 lg:hidden">
            <p className="text-xs font-semibold uppercase tracking-[0.34em]">
              Xenmesh
            </p>
            <p className="mt-2 text-[10px] uppercase tracking-[0.28em] text-black/50">
              Fashion House
            </p>
          </div>
          <div className="mb-10">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.28em] text-[#738178]">
              Welcome back
            </p>
            <h2 className="font-serif text-4xl tracking-tight sm:text-5xl">
              Sign in to your account
            </h2>
            <p className="mt-4 text-sm leading-6 text-[#6b746f]">
              Enter your admin credentials to continue to your workspace.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label
                htmlFor="email"
                className="mb-2 block text-xs font-semibold uppercase tracking-[0.15em] text-[#394640]"
              >
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="username"
                autoFocus
                required
                maxLength={254}
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="h-12 w-full border border-[#d8d9d3] bg-white px-4 text-sm outline-none transition placeholder:text-[#a2a7a2] focus:border-[#385c4e] focus:ring-2 focus:ring-[#385c4e]/10"
                placeholder="you@company.com"
              />
            </div>
            <div>
              <label
                htmlFor="password"
                className="mb-2 block text-xs font-semibold uppercase tracking-[0.15em] text-[#394640]"
              >
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="h-12 w-full border border-[#d8d9d3] bg-white px-4 text-sm outline-none transition placeholder:text-[#a2a7a2] focus:border-[#385c4e] focus:ring-2 focus:ring-[#385c4e]/10"
                placeholder="Enter your password"
              />
            </div>

            {error && (
              <p
                role="alert"
                className="border border-[#e7c7c1] bg-[#fff7f5] px-4 py-3 text-sm text-[#9b3d31]"
              >
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="flex h-12 w-full items-center justify-center bg-[#18352d] px-5 text-xs font-semibold uppercase tracking-[0.2em] text-white transition hover:bg-[#264a3f] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#18352d] disabled:cursor-wait disabled:opacity-65"
            >
              {isSubmitting ? "Signing in..." : "Sign in"}
            </button>
          </form>

          <p className="mt-8 border-t border-[#e2e2dc] pt-6 text-xs leading-5 text-[#858b86]">
            This area is restricted to authorized administrators.
          </p>
        </div>
      </section>
    </main>
  );
}
