"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

type DenverTenure = "NEW_TO_DENVER" | "ONE_TO_TWO_YEARS" | "TWO_TO_FIVE_YEARS" | "FIVE_PLUS_YEARS";

interface UserProfile {
  id: string;
  email: string;
  username: string | null;
  name: string | null;
  bio: string | null;
  profileImageUrl: string | null;
  denverTenure: DenverTenure | null;
}

const TENURE_OPTIONS: { value: DenverTenure; label: string }[] = [
  { value: "NEW_TO_DENVER", label: "New to Denver (less than 1 year)" },
  { value: "ONE_TO_TWO_YEARS", label: "1-2 years" },
  { value: "TWO_TO_FIVE_YEARS", label: "2-5 years" },
  { value: "FIVE_PLUS_YEARS", label: "5+ years (local!)" },
];

export default function ProfileSettingsPage() {
  const { data: session, status, update: updateSession } = useSession();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    username: "",
    bio: "",
    profileImageUrl: "",
    denverTenure: "" as DenverTenure | "",
  });

  // Username validation
  const [usernameError, setUsernameError] = useState<string | null>(null);

  // Photo upload mode
  const [photoMode, setPhotoMode] = useState<"upload" | "url">("upload");

  useEffect(() => {
    if (status === "loading") return;
    if (!session) {
      router.push("/auth/login");
      return;
    }

    fetchProfile();
  }, [session, status, router]);

  const fetchProfile = async () => {
    try {
      const response = await fetch("/api/users/me");
      if (response.ok) {
        const data = await response.json();
        setProfile(data);
        setFormData({
          name: data.name || "",
          username: data.username || "",
          bio: data.bio || "",
          profileImageUrl: data.profileImageUrl || "",
          denverTenure: data.denverTenure || "",
        });
      }
    } catch (err) {
      console.error("Failed to fetch profile:", err);
    } finally {
      setLoading(false);
    }
  };

  const validateUsername = (value: string) => {
    if (!value) {
      setUsernameError("Username is required");
      return false;
    }
    if (value.length < 3) {
      setUsernameError("Username must be at least 3 characters");
      return false;
    }
    if (value.length > 20) {
      setUsernameError("Username must be 20 characters or less");
      return false;
    }
    if (!/^[a-z0-9_]+$/.test(value)) {
      setUsernameError("Only lowercase letters, numbers, and underscores allowed");
      return false;
    }
    setUsernameError(null);
    return true;
  };

  const handleUsernameChange = (value: string) => {
    const lowercaseValue = value.toLowerCase().replace(/[^a-z0-9_]/g, "");
    setFormData((prev) => ({ ...prev, username: lowercaseValue }));
    validateUsername(lowercaseValue);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!validTypes.includes(file.type)) {
      setError("Please select a JPEG, PNG, WebP, or GIF image");
      return;
    }

    // Validate file size (4MB max)
    if (file.size > 4 * 1024 * 1024) {
      setError("Image must be less than 4MB");
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const formDataUpload = new FormData();
      formDataUpload.append("file", file);
      formDataUpload.append("type", "profile");

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formDataUpload,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to upload image");
      }

      setFormData((prev) => ({ ...prev, profileImageUrl: data.url }));
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload image");
    } finally {
      setUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleRemovePhoto = () => {
    setFormData((prev) => ({ ...prev, profileImageUrl: "" }));
  };

  const handleSave = async () => {
    if (!validateUsername(formData.username)) {
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await fetch("/api/users/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name || null,
          username: formData.username,
          bio: formData.bio || null,
          profileImageUrl: formData.profileImageUrl || null,
          denverTenure: formData.denverTenure || null,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to save profile");
      }

      const updated = await response.json();
      setProfile(updated);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);

      // Update the session with new username/name
      if (updated.username !== session?.user?.username || updated.name !== session?.user?.name) {
        await updateSession({
          ...session,
          user: {
            ...session?.user,
            username: updated.username,
            name: updated.name,
          },
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl pb-24">
      {/* Header */}
      <div className="mb-6 flex items-center gap-4">
        <Link
          href={profile?.username ? `/u/${profile.username}` : "/feed"}
          className="text-slate-500 hover:text-slate-700"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <h1 className="text-2xl font-bold">Edit Profile</h1>
      </div>

      {/* Form */}
      <div className="space-y-6">
        {/* Profile Photo Section */}
        <div className="card">
          <label className="block text-sm font-medium text-slate-700 mb-4">
            Profile Photo
          </label>

          <div className="flex items-start gap-6">
            {/* Photo Preview */}
            <div className="relative flex-shrink-0">
              <div className="relative h-24 w-24 rounded-full overflow-hidden bg-slate-100 border-2 border-slate-200">
                {formData.profileImageUrl ? (
                  <Image
                    src={formData.profileImageUrl}
                    alt="Profile"
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="h-full w-full flex items-center justify-center text-slate-400 text-3xl font-bold">
                    {(formData.name || formData.username || "?")[0].toUpperCase()}
                  </div>
                )}

                {/* Upload overlay */}
                {uploading && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  </div>
                )}
              </div>

              {formData.profileImageUrl && (
                <button
                  onClick={handleRemovePhoto}
                  className="absolute -top-1 -right-1 h-6 w-6 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600 transition"
                  title="Remove photo"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>

            {/* Upload Options */}
            <div className="flex-1">
              {/* Mode Toggle */}
              <div className="flex gap-2 mb-3">
                <button
                  onClick={() => setPhotoMode("upload")}
                  className={`px-3 py-1.5 text-sm font-medium rounded-lg transition ${
                    photoMode === "upload"
                      ? "bg-primary text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  Upload
                </button>
                <button
                  onClick={() => setPhotoMode("url")}
                  className={`px-3 py-1.5 text-sm font-medium rounded-lg transition ${
                    photoMode === "url"
                      ? "bg-primary text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  Use URL
                </button>
              </div>

              {photoMode === "upload" ? (
                <>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="w-full rounded-lg border-2 border-dashed border-slate-300 px-4 py-3 text-sm text-slate-600 hover:border-primary hover:text-primary transition disabled:opacity-50"
                  >
                    {uploading ? (
                      <span className="flex items-center justify-center gap-2">
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                        Uploading...
                      </span>
                    ) : (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        Choose photo
                      </span>
                    )}
                  </button>
                  <p className="mt-2 text-xs text-slate-500">
                    JPEG, PNG, WebP, or GIF. Max 4MB.
                  </p>
                </>
              ) : (
                <>
                  <input
                    type="url"
                    value={formData.profileImageUrl}
                    onChange={(e) => setFormData((prev) => ({ ...prev, profileImageUrl: e.target.value }))}
                    placeholder="https://example.com/your-photo.jpg"
                    className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                  <p className="mt-2 text-xs text-slate-500">
                    Enter a direct link to an image (e.g., from LinkedIn or social media).
                  </p>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Display Name */}
        <div className="card">
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Display Name
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
            placeholder="Your display name"
            maxLength={50}
            className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-slate-900 placeholder-slate-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
          <p className="mt-2 text-xs text-slate-500">
            How you want to be known on Pulse. This will be shown on your profile and lists.
          </p>
        </div>

        {/* Username */}
        <div className="card">
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Username <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">@</span>
            <input
              type="text"
              value={formData.username}
              onChange={(e) => handleUsernameChange(e.target.value)}
              placeholder="your_username"
              maxLength={20}
              className={`w-full rounded-lg border bg-white pl-8 pr-4 py-2.5 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 ${
                usernameError
                  ? "border-red-300 focus:border-red-500 focus:ring-red-200"
                  : "border-slate-200 focus:border-primary focus:ring-primary/20"
              }`}
            />
          </div>
          {usernameError && (
            <p className="mt-2 text-xs text-red-600">{usernameError}</p>
          )}
          <p className="mt-2 text-xs text-slate-500">
            Your unique identifier. Used for your profile URL: pulse.app/u/{formData.username || "username"}
          </p>
        </div>

        {/* Bio */}
        <div className="card">
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Bio
          </label>
          <textarea
            value={formData.bio}
            onChange={(e) => setFormData((prev) => ({ ...prev, bio: e.target.value }))}
            placeholder="Tell people a bit about yourself..."
            rows={3}
            maxLength={200}
            className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-slate-900 placeholder-slate-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
          />
          <p className="mt-2 text-xs text-slate-500 text-right">
            {formData.bio.length}/200
          </p>
        </div>

        {/* Denver Tenure */}
        <div className="card">
          <label className="block text-sm font-medium text-slate-700 mb-2">
            How long have you been in Denver?
          </label>
          <div className="space-y-2">
            {TENURE_OPTIONS.map((option) => (
              <label
                key={option.value}
                className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition ${
                  formData.denverTenure === option.value
                    ? "border-primary bg-primary/5"
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <input
                  type="radio"
                  name="denverTenure"
                  value={option.value}
                  checked={formData.denverTenure === option.value}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      denverTenure: e.target.value as DenverTenure,
                    }))
                  }
                  className="h-4 w-4 text-primary focus:ring-primary"
                />
                <span className="text-sm text-slate-700">{option.label}</span>
              </label>
            ))}
          </div>
          <p className="mt-2 text-xs text-slate-500">
            This helps us tailor recommendations - Denver veterans get hidden gems, newcomers get local favorites!
          </p>
        </div>
      </div>

      {/* Fixed Save Button */}
      <div className="fixed bottom-0 left-0 right-0 border-t border-slate-200 bg-white px-4 py-4">
        <div className="mx-auto flex max-w-2xl items-center gap-4">
          <button
            onClick={handleSave}
            disabled={saving || !!usernameError}
            className="flex-1 rounded-lg bg-primary px-6 py-3 font-semibold text-white transition hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? "Saving..." : "Save Profile"}
          </button>
          {success && (
            <span className="text-sm font-medium text-green-600">
              Saved!
            </span>
          )}
          {error && (
            <span className="text-sm font-medium text-red-600">
              {error}
            </span>
          )}
        </div>
      </div>

      {/* Settings Navigation */}
      <div className="mt-8 card">
        <h3 className="text-sm font-semibold text-slate-900 mb-3">Other Settings</h3>
        <div className="space-y-2">
          <Link
            href="/settings/preferences"
            className="flex items-center justify-between py-2 text-slate-600 hover:text-slate-900 transition"
          >
            <span className="text-sm">Event Preferences</span>
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
          <Link
            href="/community/badges"
            className="flex items-center justify-between py-2 text-slate-600 hover:text-slate-900 transition"
          >
            <span className="text-sm">Your Badges</span>
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </div>
    </div>
  );
}
