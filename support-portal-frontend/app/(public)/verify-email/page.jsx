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
        setMessage(
          err.response?.data?.error?.message ||
          err.response?.data?.message ||
          err.message ||
          "Invalid or expired verification token."
        );
      }
    };

    verify();
  }, [token]);

  return (
    <>
      {status === "verifying" && (
        <div className="py-8">
          <div className="w-14 h-14 bg-sky-50 rounded-2xl flex items-center justify-center border border-sky-100 shadow-sm mx-auto mb-4">
            <Loader2 className="w-8 h-8 text-sky-600 animate-spin" />
          </div>
          <h2 className="text-xl font-black text-stone-900 tracking-tight">Verifying Email...</h2>
          <p className="text-xs text-stone-500 font-medium mt-1">Please wait while we confirm your account</p>
        </div>
      )}

      {status === "success" && (
        <div className="py-6 space-y-4">
          <div className="w-14 h-14 bg-emerald-50 border border-emerald-200 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto shadow-sm">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-black text-stone-900 tracking-tight">Verified!</h2>
          <p className="text-stone-600 text-xs leading-relaxed font-medium">{message}</p>

          <Link
            href="/login"
            className="w-full py-3.5 bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white font-bold text-xs uppercase tracking-widest rounded-xl transition-all shadow-md shadow-sky-600/25 flex items-center justify-center gap-2"
          >
            Continue to Sign In <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      )}

      {status === "error" && (
        <div className="py-6 space-y-4">
          <div className="w-14 h-14 bg-rose-50 border border-rose-200 text-rose-600 rounded-2xl flex items-center justify-center mx-auto shadow-sm">
            <XCircle className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-black text-stone-900 tracking-tight">Verification Failed</h2>
          <p className="text-rose-700 bg-rose-50 border border-rose-200 rounded-xl p-3 text-xs leading-relaxed font-medium">
            {message}
          </p>

          <Link
            href="/login"
            className="w-full py-3.5 bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold text-xs uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2"
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
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className="w-full max-w-md"
    >
      <div className="bg-white border border-stone-200/80 rounded-3xl p-8 sm:p-10 shadow-xl shadow-sky-100/50 text-center">
        <Suspense fallback={<div className="py-8 text-stone-400 text-xs font-medium">Loading verification...</div>}>
          <VerifyEmailContent />
        </Suspense>
      </div>
    </motion.div>
  );
}
