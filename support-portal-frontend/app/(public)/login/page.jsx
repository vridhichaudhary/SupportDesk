"use client";
import { useState } from "react";
import axiosInstance from "@/utils/axiosInstance";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: "", password: "" });
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const change = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setMessage("");

    try {
      setLoading(true);
      const res = await axiosInstance.post("/auth/login", form);
      const { token, user } = res.data;

      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user));

      router.push(user.role === "admin" ? "/admin/dashboard" : "/user/dashboard");
    } catch (err) {
      setMessage("Invalid email or password");
    }
    setLoading(false);
  };

  return (
    <div className="flex items-center justify-center min-h-screen">
      <form onSubmit={submit} className="bg-white p-8 rounded-lg shadow w-full max-w-md">
        <h1 className="text-2xl font-bold text-center mb-4">Welcome Back</h1>

        <input
          name="email"
          type="email"
          placeholder="Email"
          className="w-full border p-3 rounded mb-3"
          onChange={change}
        />

        <input
          name="password"
          type="password"
          placeholder="Password"
          className="w-full border p-3 rounded mb-6"
          onChange={change}
        />

        <button className="w-full bg-blue-600 text-white py-3 rounded">
          {loading ? "Signing in..." : "Sign In"}
        </button>

        {message && <p className="text-red-600 mt-4 text-center">{message}</p>}

        <p className="text-center mt-4">
          Don’t have an account?{" "}
          <Link href="/signup" className="text-blue-600">Sign up</Link>
        </p>
      </form>
    </div>
  );
}
