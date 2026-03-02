import React from "react";
import { redirect } from "next/navigation";
import { getSession } from "@/src/lib/session";
import LogoutButton from "./LogoutButton";

export default async function SakinLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  if (!session || session.role !== "SAKIN") {
    redirect("/");
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="mx-auto max-w-lg px-4 sm:px-6 h-16 flex items-center justify-between">
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
              YVZ Yönetim
            </span>
          </div>
          <LogoutButton />
        </div>
      </header>

      <main className="mx-auto max-w-lg px-4 sm:px-6 py-6 sm:py-8">
        {children}
      </main>
    </div>
  );
}
