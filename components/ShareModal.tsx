"use client";

import { useState, useEffect, useRef } from "react";
import QRCode from "qrcode";

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  url: string;
  title: string;
  description?: string;
}

export default function ShareModal({
  isOpen,
  onClose,
  url,
  title,
  description,
}: ShareModalProps) {
  const [copied, setCopied] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [showQR, setShowQR] = useState(false);
  const [canNativeShare, setCanNativeShare] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    // Check if native share is available (only on client)
    setCanNativeShare(typeof navigator !== "undefined" && !!navigator.share);
  }, []);

  useEffect(() => {
    if (isOpen && showQR && canvasRef.current) {
      generateQRCode();
    }
  }, [isOpen, showQR, url]);

  const generateQRCode = async () => {
    try {
      const dataUrl = await QRCode.toDataURL(url, {
        width: 256,
        margin: 2,
        color: {
          dark: "#000000",
          light: "#FFFFFF",
        },
      });
      setQrCodeUrl(dataUrl);
    } catch {
      /* silently handled */
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* silently handled */
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title,
          text: description || `Check out ${title}`,
          url,
        });
      } catch (err) {
        // User cancelled or share failed silently
      }
    }
  };

  const handleDownloadQR = () => {
    if (!qrCodeUrl) return;
    const link = document.createElement("a");
    link.download = `${title.replace(/\s+/g, "-").toLowerCase()}-qr.png`;
    link.href = qrCodeUrl;
    link.click();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Share</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="mb-4 flex rounded-lg bg-slate-100 p-1">
          <button
            onClick={() => setShowQR(false)}
            className={`flex-1 rounded-md py-2 text-sm font-medium transition ${
              !showQR ? "bg-white text-slate-900 shadow-sm" : "text-slate-600"
            }`}
          >
            Share Link
          </button>
          <button
            onClick={() => setShowQR(true)}
            className={`flex-1 rounded-md py-2 text-sm font-medium transition ${
              showQR ? "bg-white text-slate-900 shadow-sm" : "text-slate-600"
            }`}
          >
            QR Code
          </button>
        </div>

        {!showQR ? (
          <>
            {/* Share Options */}
            <div className="space-y-2">
              {/* Copy Link */}
              <button
                onClick={handleCopyLink}
                className="flex w-full items-center gap-3 rounded-xl border border-slate-200 p-4 text-left transition hover:bg-slate-50"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100">
                  <svg className="h-5 w-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <div className="font-medium text-slate-900">
                    {copied ? "Copied!" : "Copy link"}
                  </div>
                  <div className="text-sm text-slate-500 truncate max-w-xs">
                    {url}
                  </div>
                </div>
              </button>

              {/* Native Share (Mobile) */}
              {canNativeShare && (
                <button
                  onClick={handleNativeShare}
                  className="flex w-full items-center gap-3 rounded-xl border border-slate-200 p-4 text-left transition hover:bg-slate-50"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
                    <svg className="h-5 w-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                    </svg>
                  </div>
                  <div>
                    <div className="font-medium text-slate-900">Share via...</div>
                    <div className="text-sm text-slate-500">Open share menu</div>
                  </div>
                </button>
              )}

              {/* Twitter/X */}
              <a
                href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex w-full items-center gap-3 rounded-xl border border-slate-200 p-4 text-left transition hover:bg-slate-50"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-900">
                  <span className="text-lg font-bold text-white">X</span>
                </div>
                <div>
                  <div className="font-medium text-slate-900">Share on X</div>
                  <div className="text-sm text-slate-500">Post to your timeline</div>
                </div>
              </a>

              {/* Facebook */}
              <a
                href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex w-full items-center gap-3 rounded-xl border border-slate-200 p-4 text-left transition hover:bg-slate-50"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600">
                  <span className="text-lg font-bold text-white">f</span>
                </div>
                <div>
                  <div className="font-medium text-slate-900">Share on Facebook</div>
                  <div className="text-sm text-slate-500">Share with friends</div>
                </div>
              </a>

              {/* Text Message (Mobile) */}
              <a
                href={`sms:?body=${encodeURIComponent(`Check out ${title}: ${url}`)}`}
                className="flex w-full items-center gap-3 rounded-xl border border-slate-200 p-4 text-left transition hover:bg-slate-50"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-500">
                  <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <div>
                  <div className="font-medium text-slate-900">Text Message</div>
                  <div className="text-sm text-slate-500">Send via iMessage or SMS</div>
                </div>
              </a>
            </div>
          </>
        ) : (
          <>
            {/* QR Code */}
            <div className="flex flex-col items-center">
              {qrCodeUrl ? (
                <img
                  src={qrCodeUrl}
                  alt="QR Code"
                  className="mb-4 rounded-lg border border-slate-200"
                />
              ) : (
                <div className="mb-4 flex h-64 w-64 items-center justify-center rounded-lg border border-slate-200 bg-slate-50">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                </div>
              )}

              <p className="mb-4 text-center text-sm text-slate-600">
                Scan this QR code to open this list
              </p>

              <button
                onClick={handleDownloadQR}
                disabled={!qrCodeUrl}
                className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Download QR Code
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
