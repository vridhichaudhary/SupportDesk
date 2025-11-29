"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // Check if user is already logged in
    const token = localStorage.getItem("token");
    const userJSON = localStorage.getItem("user");

    if (token && userJSON) {
      try {
        const user = JSON.parse(userJSON);
        // Redirect based on role
        if (user.role === "admin") {
          router.replace("/admin/dashboard");
        } else {
          router.replace("/user/dashboard");
        }
      } catch (error) {
        console.error("Invalid user data:", error);
        router.replace("/login");
      }
    } else {
      // No token, redirect to signup
      router.replace("/signup");
    }
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
        <p className="text-gray-600 text-lg">Loading SupportDesk...</p>
      </div>
    </div>
  );
}