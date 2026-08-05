"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function PortalGuard({ children }) {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const userStr = localStorage.getItem("user");

    if (!token || !userStr) {
      router.push("/portal/login");
      return;
    }

    try {
      const user = JSON.parse(userStr);
      if (user.role !== "CUSTOMER") {
        router.push("/admin/dashboard");
      } else {
        setAuthorized(true);
      }
    } catch (err) {
      router.push("/portal/login");
    }
  }, [router]);

  if (!authorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-sky-600"></div>
      </div>
    );
  }

  return children;
}
