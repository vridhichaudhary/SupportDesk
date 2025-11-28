// "use client";
// import { useEffect } from "react";
// import { useRouter } from "next/navigation";

// export default function Home() {
//   const router = useRouter();

//   useEffect(() => {
//     const token = localStorage.getItem("token");
//     const userJSON = localStorage.getItem("user");

//     if (token && userJSON) {
//       try {
//         const user = JSON.parse(userJSON);
//         if (user.role === "admin") {
//           router.push("/admin");
//         } else {
//           router.push("/dashboard");
//         }
//       } catch {
//         router.push("/signup");
//       }
//     } else {
//       router.push("/signup");
//     }
//   }, [router]);

//   return (
//     <div className="flex items-center justify-center min-h-screen bg-gray-100">
//       <div className="text-gray-600">Loading...</div>
//     </div>
//   );
// }