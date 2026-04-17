"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Image from "next/image";

interface ReferralUser {
  id: string;
  name: string | null;
  profileImageUrl: string | null;
}

interface Referral {
  id: string;
  user: ReferralUser;
  joinedAt: string;
}

interface ReferralData {
  referralCode: string | null;
  referralCount: number;
  referrals: Referral[];
}

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function ReferralsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [data, setData] = useState<ReferralData | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (status === "loading") return;
    if (!session) {
      router.push("/auth/login");
      return;
    }
    fetchReferralData();
  }, [session, status, router]);

  const fetchReferralData = async () => {
    try {
      const response = await fetch("/api/referral");
      if (response.ok) {
        const result = await response.json();
        setData(result);
      }
    } catch (error) {
      console.error("Failed to fetch referral data:", error);
    } finally {
      setLoading(false);
    }
  };

  const generateReferralCode = async () => {
    setGenerating(true);
    try {
      const response = await fetch("/api/referral", {
        method: "POST",
      });
      if (response.ok) {
        const result = await response.json();
        setData((prev) =>
          prev ? { ...prev, referralCode: result.referralCode } : null
        );
      }
    } catch (error) {
      console.error("Failed to generate referral code:", error);
    } finally {
      setGenerating(false);
    }
  };

  const handleCopyLink = async () => {
    if (!data?.referralCode) return;
    const url = `${window.location.origin}/auth/signup?ref=${data.referralCode}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyCode = async () => {
    if (!data?.referralCode) return;
    await navigator.clipboard.writeText(data.referralCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (status === "loading" || loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Referrals</h1>
        <p className="text-slate-600">Invite friends and grow the Pulse community</p>
      </div>

      {/* Referral Code Card */}
      <div className="card">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Your Referral Code</h2>

        {data?.referralCode ? (
          <div className="space-y-4">
            {/* Code Display */}
            <div className="flex items-center gap-3">
              <div className="flex-1 rounded-lg bg-slate-100 px-4 py-3">
                <code className="text-lg font-mono font-bold text-primary">
                  {data.referralCode}
                </code>
              </div>
              <button
                onClick={handleCopyCode}
                className="rounded-md bg-slate-100 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-200 transition"
              >
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>

            {/* Share Link */}
            <div className="rounded-lg border border-slate-200 p-4">
              <p className="text-sm text-slate-600 mb-3">Share this link with friends:</p>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={`${typeof window !== "undefined" ? window.location.origin : ""}/auth/signup?ref=${data.referralCode}`}
                  className="flex-1 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600"
                />
                <button
                  onClick={handleCopyLink}
                  className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 transition"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                    />
                  </svg>
                  {copied ? "Copied!" : "Copy Link"}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-6">
            <p className="text-slate-600 mb-4">
              Generate your unique referral code to start inviting friends.
            </p>
            <button
              onClick={generateReferralCode}
              disabled={generating}
              className="btn-primary disabled:opacity-50"
            >
              {generating ? "Generating..." : "Generate Referral Code"}
            </button>
          </div>
        )}
      </div>

      {/* Stats Card */}
      <div className="card">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Your Impact</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-lg bg-primary/5 p-4 text-center">
            <p className="text-3xl font-bold text-primary">{data?.referralCount || 0}</p>
            <p className="text-sm text-slate-600">Friends Referred</p>
          </div>
          <div className="rounded-lg bg-green-50 p-4 text-center">
            <p className="text-3xl font-bold text-green-600">{data?.referralCount || 0}</p>
            <p className="text-sm text-slate-600">Successful Signups</p>
          </div>
        </div>
      </div>

      {/* Referrals List */}
      {data && data.referrals.length > 0 && (
        <div className="card">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">
            People You&apos;ve Referred
          </h2>
          <div className="space-y-3">
            {data.referrals.map((referral) => (
              <div
                key={referral.id}
                className="flex items-center gap-3 rounded-lg border border-slate-100 p-3"
              >
                <div className="relative h-10 w-10 rounded-full overflow-hidden bg-slate-100">
                  {referral.user.profileImageUrl ? (
                    <Image
                      src={referral.user.profileImageUrl}
                      alt={referral.user.name || "User"}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center text-slate-400 font-bold">
                      {(referral.user.name || "U")[0].toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-900 truncate">
                    {referral.user.name || "Anonymous User"}
                  </p>
                  <p className="text-xs text-slate-500">
                    Joined {formatDate(referral.joinedAt)}
                  </p>
                </div>
                <svg
                  className="h-5 w-5 text-green-500"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                </svg>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state for referrals */}
      {data && data.referralCode && data.referrals.length === 0 && (
        <div className="card text-center py-8">
          <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-slate-100 p-4">
            <svg
              className="h-8 w-8 text-slate-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
          </div>
          <h3 className="mb-2 text-lg font-semibold text-slate-900">
            No referrals yet
          </h3>
          <p className="text-slate-600">
            Share your referral link to invite friends to Pulse!
          </p>
        </div>
      )}
    </div>
  );
}
