"use client";

import { useRouter } from "next/navigation";

export default function LogoutButton() {
  const router = useRouter();

  const handleLogout = async () => {
    await fetch("/api/logout", { method: "POST" });
    router.push("/");
  };

  return (
    <button
      type="button"
      onClick={handleLogout}
      className="inline-flex items-center rounded-full border border-gray-300 bg-white px-3 py-1.5 text-xs sm:text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
    >
      Çıkış Yap
    </button>
  );
}
