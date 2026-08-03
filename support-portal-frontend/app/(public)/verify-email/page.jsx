"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { CheckCircle2, XCircle, Loader2, ArrowRight } from "lucide-react";
import axiosInstance from "@/utils/axiosInstance";

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const [status, setStatus] = useState("verifying"); // verifying, success, error
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("Missing email verification token");
      return;
    }

    const verify = async () => {
      try {
        await axiosInstance.get(`/auth/verify-email?token=${token}`);
        setStatus("success");
        setMessage("Your email address has been verified successfully!");
      } catch (err) {
        setStatus("error");
        setMessage(err.response?.data?.error?.message || "Invalid or expired verification token.");
      }
    };

    verify();
  }, [token]);

  return (
    <>
      {status === "verifying" && (
        <div className="py-8">
          <Loader2 className="w-12 h-12 text-indigo-500 animate-spin mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white">Verifying Email...</h2>
          <p className="text-xs text-stone-400 mt-2">Please wait while we confirm your account</p>
        </div>
      )}

      {status === "success" && (
        <div className="py-6 space-y-4">
          <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/10">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-black text-white">Verified!</h2>
          <p className="text-stone-300 text-xs leading-relaxed">{message}</p>

          <Link
            href="/login"
            className="w-full py-3.5 bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-bold text-xs uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2"
          >
            Continue to Sign In <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      )}

      {status === "error" && (
        <div className="py-6 space-y-4">
          <div className="w-16 h-16 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-rose-500/10">
            <XCircle className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-black text-white">Verification Failed</h2>
          <p className="text-stone-400 text-xs leading-relaxed">{message}</p>

          <Link
            href="/login"
            className="w-full py-3.5 bg-stone-800 hover:bg-stone-700 text-white font-bold text-xs uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2"
          >
            Back to Sign In
          </Link>
        </div>
      )}
    </>
  );
}

export default function VerifyEmailPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-950 p-6 font-sans text-stone-100">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-sm">
        <div className="bg-stone-900 border border-stone-800 rounded-3xl p-8 shadow-2xl text-center">
          <Suspense fallback={<div className="py-8 text-stone-400">Loading verification...</div>}>
            <VerifyEmailContent />
          </Suspense>
        </div>
      </motion.div>
    </div>
  );
}
