"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import axiosInstance from "@/utils/axiosInstance";

function OAuthCallbackContent() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const provider = params?.provider;

  const [status, setStatus] = useState("loading"); // "loading" | "success" | "error"
  const [errorMessage, setErrorMessage] = useState("");
  const executedRef = useRef(false);

  useEffect(() => {
    if (executedRef.current) return;

    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const errorParam = searchParams.get("error");
    const errorDescription = searchParams.get("error_description");

    if (errorParam) {
      setStatus("error");
      setErrorMessage(errorDescription || `Authentication cancelled by ${provider || "provider"}.`);
      return;
    }

    if (!code) {
      setStatus("error");
      setErrorMessage("No authorization code provided in callback query.");
      return;
    }

    // Mark as executed to prevent duplicate execution during React StrictMode mount cycles
    executedRef.current = true;

    async function handleExchange() {
      try {
        // Exchange OAuth code for JWT access token via POST exchange
        const res = await axiosInstance.post(`/auth/${provider}/exchange`, { code, state });
        const accessToken = res.data?.data?.access_token;

        if (!accessToken) {
          throw new Error("No access token returned from authentication service.");
        }

        if (typeof window !== "undefined") {
          localStorage.setItem("token", accessToken);
        }

        // Fetch authenticated user profile
        const meRes = await axiosInstance.get("/auth/me");
        const user = meRes.data?.data;

        if (typeof window !== "undefined" && user) {
          localStorage.setItem("user", JSON.stringify(user));
        }

        setStatus("success");
        setTimeout(() => {
          if (user?.role === "CUSTOMER") {
            router.push("/portal/dashboard");
          } else {
            router.push("/admin/dashboard");
          }
        }, 800);
      } catch (err) {
        setStatus("error");
        const msg =
          err.response?.data?.error?.message ||
          err.response?.data?.detail ||
          err.message ||
          "Failed to complete OAuth authentication.";
        setErrorMessage(msg);
      }
    }

    handleExchange();
  }, [provider, searchParams, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-50 p-6 font-sans text-stone-900 selection:bg-sky-100 selection:text-sky-900">
      <div className="w-full max-w-md bg-white border border-stone-200/80 rounded-3xl p-8 shadow-xl shadow-sky-100/50 text-center">
        {status === "loading" && (
          <div className="py-8 flex flex-col items-center gap-4">
            <div className="w-14 h-14 bg-sky-50 rounded-2xl flex items-center justify-center border border-sky-100 shadow-sm">
              <Loader2 className="w-8 h-8 text-sky-600 animate-spin" />
            </div>
            <div>
              <h2 className="text-xl font-black text-stone-900 tracking-tight">Completing Sign In</h2>
              <p className="text-xs text-stone-500 font-medium mt-1">
                Authenticating with {provider ? provider.toUpperCase() : "identity provider"}…
              </p>
            </div>
          </div>
        )}

        {status === "success" && (
          <div className="py-8 flex flex-col items-center gap-4">
            <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center border border-emerald-100 shadow-sm">
              <CheckCircle2 className="w-8 h-8 text-emerald-600" />
            </div>
            <div>
              <h2 className="text-xl font-black text-stone-900 tracking-tight">Sign In Successful!</h2>
              <p className="text-xs text-stone-500 font-medium mt-1">Redirecting to your dashboard…</p>
            </div>
          </div>
        )}

        {status === "error" && (
          <div className="py-6 flex flex-col items-center gap-4">
            <div className="w-14 h-14 bg-rose-50 rounded-2xl flex items-center justify-center border border-rose-100 shadow-sm">
              <AlertCircle className="w-8 h-8 text-rose-600" />
            </div>
            <div>
              <h2 className="text-xl font-black text-stone-900 tracking-tight">Authentication Failed</h2>
              <p className="text-xs text-stone-500 font-medium mt-1">
                Unable to complete authorization with {provider ? provider.toUpperCase() : "provider"}
              </p>
            </div>
            <p className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-xl p-3.5 text-left w-full font-medium leading-relaxed">
              {errorMessage}
            </p>
            <button
              onClick={() => router.push("/login")}
              className="mt-2 w-full py-3 bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-md shadow-sky-600/20"
            >
              Return to Sign In
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function OAuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-stone-50">
          <Loader2 className="w-8 h-8 text-sky-600 animate-spin" />
        </div>
      }
    >
      <OAuthCallbackContent />
    </Suspense>
  );
}
