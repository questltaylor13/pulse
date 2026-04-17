"use client";

import { FormEvent, useState } from "react";
import { signIn, getSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

// Helper to wait for session with retries
async function waitForSession(maxRetries = 5, delayMs = 200) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const session = await getSession();
      if (session?.user) {
        return session;
      }
    } catch (err) {
      console.warn(`Session fetch attempt ${i + 1} failed:`, err);
    }
    // Wait before retrying
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
  return null;
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const result = await signIn("credentials", {
        redirect: false,
        email,
        password,
      });

      if (result?.error) {
        setError("Invalid email or password");
        setLoading(false);
        return;
      }

      // Wait for session to be established with retries
      const session = await waitForSession();

      if (!session) {
        // Session not found after retries, redirect to feed anyway
        // The middleware or feed page will handle redirecting if needed
        router.push("/feed");
        router.refresh();
        return;
      }

      if (session.user?.onboardingComplete) {
        router.push("/feed");
      } else {
        router.push("/onboarding");
      }
      router.refresh();
    } catch (err) {
      console.error("Login error:", err);
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-md space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-3xl font-semibold text-slate-900">Log in</h1>
        <p className="text-sm text-slate-600">Welcome back to Pulse.</p>
      </div>
      <form onSubmit={handleSubmit} className="card space-y-4">
        <div className="space-y-1">
          <label htmlFor="email" className="text-sm font-medium text-slate-700">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="password" className="text-sm font-medium text-slate-700">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <button type="submit" className="btn-primary w-full" disabled={loading}>
          {loading ? "Signing in..." : "Sign in"}
        </button>
        <p className="text-center text-sm text-slate-600">
          No account? {" "}
          <Link href="/auth/signup" className="font-semibold text-primary hover:underline">
            Sign up
          </Link>
        </p>
      </form>
    </div>
  );
}
