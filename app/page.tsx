"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = phone.trim().replace(/\s/g, "");
    if (!trimmed) {
      setError("Telefon numaranızı girin.");
      return;
    }
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: trimmed }),
      });

      const text = await res.text();
      let data: { success?: boolean; error?: string; redirect?: string } = {};
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        setError("Sunucu geçersiz yanıt döndü.");
        return;
      }

      if (data.success && data.redirect) {
        router.push(data.redirect);
      } else {
        setError(data.error ?? "Giriş yapılamadı.");
      }
    } catch {
      setError("Bağlantı hatası. Lütfen tekrar deneyin.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="bg-white shadow-lg rounded-2xl px-6 py-8 sm:px-8 sm:py-10">
          <div className="flex flex-col items-center gap-3 mb-8">
            <span className="flex items-center justify-center rounded-2xl bg-blue-600 p-3">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-7 w-7"
              >
                <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
            </span>
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-gray-900 text-center">
              YVZ Yönetim
            </h1>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <label
                htmlFor="phone"
                className="block text-sm font-medium text-gray-700"
              >
                Telefon Numarası
              </label>
              <input
                id="phone"
                name="phone"
                type="tel"
                inputMode="tel"
                placeholder="05XX XXX XX XX"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="block w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-base text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
              />
            </div>

            {error && (
              <p className="text-sm text-red-600 font-medium">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-blue-600 px-4 py-3 text-base font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
            >
              {loading ? "Giriş yapılıyor..." : "Giriş Yap"}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
