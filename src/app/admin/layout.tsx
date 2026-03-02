import React from "react";
import Link from "next/link";
import AdminNav from "@/app/admin/AdminNav";

function BrandLogo() {
  return (
    <div className="flex items-center gap-2">
      <span className="flex items-center justify-center rounded-lg bg-blue-600 p-1.5">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="white"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-4 w-4"
        >
          <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
      </span>
      <span className="text-sm sm:text-base font-semibold tracking-tight text-gray-900">
        YVZ Yönetim{" "}
        <span className="text-gray-400 font-normal">| Super Admin</span>
      </span>
    </div>
  );
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <BrandLogo />
          <Link
            href="/api/logout"
            className="inline-flex items-center rounded-full border border-gray-300 bg-white px-3 py-1.5 text-xs sm:text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
          >
            Çıkış Yap
          </Link>
        </div>
      </header>

      <AdminNav />

      <main className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {children}
      </main>
    </div>
  );
}

