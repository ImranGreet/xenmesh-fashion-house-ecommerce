import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SignOutButton } from "./sign-out-button";

export const instant = false;

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

interface AdminUser {
  email: string;
  firstName: string | null;
  lastName: string | null;
}

export default async function AdminPage() {
  const cookieHeader = (await cookies()).toString();
  const response = await fetch(`${apiUrl}/auth/me`, {
    headers: { cookie: cookieHeader },
    cache: "no-store",
  });

  if (!response.ok) {
    redirect("/login");
  }

  const { user } = (await response.json()) as { user: AdminUser };
  const displayName =
    [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email;

  return (
    <main className="min-h-screen bg-[#f6f5f2]">
      <header className="flex items-center justify-between border-b border-[#e4e3dd] bg-white px-6 py-5 sm:px-10">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em]">
            Xenmesh
          </p>
          <p className="mt-1 text-[10px] uppercase tracking-[0.22em] text-[#78817b]">
            Fashion House · Admin
          </p>
        </div>
        <SignOutButton />
      </header>
      <section className="mx-auto max-w-5xl px-6 py-16 sm:px-10">
        <p className="text-xs uppercase tracking-[0.25em] text-[#738178]">
          Admin workspace
        </p>
        <h1 className="mt-4 font-serif text-4xl tracking-tight sm:text-5xl">
          Welcome, {displayName}
        </h1>
        <p className="mt-4 max-w-xl text-sm leading-7 text-[#6b746f]">
          You are signed in. Your admin workspace is ready for the store
          management features you build next.
        </p>
        <div className="mt-10 border border-[#e2e2dc] bg-white p-6 text-sm text-[#59635d]">
          Signed in as <span className="font-medium text-[#17211e]">{user.email}</span>
        </div>
      </section>
    </main>
  );
}
