"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const apiUrl =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export function SignOutButton() {
  const router = useRouter();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [error, setError] = useState("");

  async function signOut() {
    setIsSigningOut(true);
    setError("");
    try {
      const response = await fetch(`${apiUrl}/auth/sign-out`, {
        method: "POST",
        credentials: "include",
      });
      if (!response.ok) {
        setError("Unable to sign out. Please try again.");
        setIsSigningOut(false);
        return;
      }
      router.replace("/login");
      router.refresh();
    } catch {
      setError("Cannot reach the authentication server.");
      setIsSigningOut(false);
    }
  }

  return (
    <div className="flex items-center gap-3">
      {error && <p role="alert" className="text-xs text-[#9b3d31]">{error}</p>}
      <button
        type="button"
        onClick={signOut}
        disabled={isSigningOut}
        className="border border-[#d8d9d3] px-4 py-2 text-xs font-semibold uppercase tracking-[0.15em] text-[#394640] transition hover:border-[#18352d] hover:text-[#18352d] disabled:opacity-60"
      >
        {isSigningOut ? "Signing out..." : "Sign out"}
      </button>
    </div>
  );
}
