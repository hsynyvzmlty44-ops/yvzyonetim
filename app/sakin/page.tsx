"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type DueItem = {
  id: string;
  amountTry: number;
  dueDate: string;
  period: string;
  publicToken: string;
  isPaid: boolean;
};

type PageData = {
  resident: { fullName: string; unitLabel: string };
  apartment: { name: string };
  dues: DueItem[];
  totalDebt: number;
};

function formatTRY(n: number) {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    minimumFractionDigits: 0,
  }).format(n);
}

function formatPeriod(p: string) {
  return new Date(p).toLocaleString("tr-TR", {
    month: "long",
    year: "numeric",
  });
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("tr-TR");
}

export default function SakinPage() {
  const [data, setData] = useState<PageData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/sakin/dues");
        const text = await res.text();
        let json: any = {};
        try {
          json = text ? JSON.parse(text) : {};
        } catch {
          setError("Sunucu geçersiz yanıt döndü.");
          return;
        }
        if (!res.ok || !json.success) {
          setError(json.error ?? "Veriler yüklenemedi.");
        } else {
          setData(json);
        }
      } catch {
        setError("Bağlantı hatası.");
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <p className="text-gray-400 text-sm">Yükleniyor...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <p className="text-red-600 text-sm font-medium">{error}</p>
      </div>
    );
  }

  if (!data) return null;

  const unpaidDues = data.dues.filter((d) => !d.isPaid);
  const paidDues = data.dues.filter((d) => d.isPaid);

  return (
    <div className="space-y-5">
      {/* Kişi başlığı */}
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-gray-900">
          Merhaba, {data.resident.fullName.split(" ")[0]}
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {data.apartment.name} — {data.resident.unitLabel}
        </p>
      </div>

      {/* Toplam borç kartı */}
      {data.totalDebt > 0 ? (
        <div className="bg-red-50 border border-red-100 rounded-2xl px-5 py-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-red-400">
            Toplam Borcunuz
          </p>
          <p className="mt-1.5 text-3xl font-bold text-red-600">
            {formatTRY(data.totalDebt)}
          </p>
          <p className="text-xs text-red-400 mt-1">
            {unpaidDues.length} adet ödenmemiş aidat
          </p>
        </div>
      ) : (
        <div className="bg-green-50 border border-green-100 rounded-2xl px-5 py-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-green-500">
            Borç Durumu
          </p>
          <p className="mt-1.5 text-xl font-bold text-green-600">
            Tüm aidatlarınız ödenmiş ✓
          </p>
        </div>
      )}

      {/* Bekleyen aidatlar */}
      {unpaidDues.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="text-base font-semibold text-gray-900">
              Bekleyen Aidatlar
            </h2>
          </div>
          <ul className="divide-y divide-gray-100">
            {unpaidDues.map((due) => (
              <li
                key={due.id}
                className="px-5 py-4 flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900">
                    {formatPeriod(due.period)}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Son ödeme: {formatDate(due.dueDate)}
                  </p>
                </div>
                <div className="flex-shrink-0 flex flex-col items-end gap-2">
                  <p className="text-base font-bold text-gray-900">
                    {formatTRY(due.amountTry)}
                  </p>
                  <Link
                    href={`/odeme/${due.publicToken}`}
                    className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700 whitespace-nowrap"
                  >
                    Şimdi Öde
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Ödenen aidatlar */}
      {paidDues.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="text-base font-semibold text-gray-900">
              Ödeme Geçmişi
            </h2>
          </div>
          <ul className="divide-y divide-gray-100">
            {paidDues.map((due) => (
              <li
                key={due.id}
                className="px-5 py-4 flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-700">
                    {formatPeriod(due.period)}
                  </p>
                </div>
                <div className="flex-shrink-0 flex items-center gap-3">
                  <p className="text-sm font-semibold text-gray-900">
                    {formatTRY(due.amountTry)}
                  </p>
                  <span className="inline-flex items-center rounded-full bg-green-50 px-2.5 py-1 text-xs font-semibold text-green-700">
                    Ödendi
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {data.dues.length === 0 && (
        <div className="bg-white rounded-2xl shadow-sm px-5 py-10 text-center">
          <p className="text-sm text-gray-400">Henüz aidat kaydı bulunmuyor.</p>
        </div>
      )}
    </div>
  );
}
