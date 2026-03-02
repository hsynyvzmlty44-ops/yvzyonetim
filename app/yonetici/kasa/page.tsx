"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type TxItem = {
  id: string;
  amountTry: number;
  method: "CASH" | "ONLINE";
  status: string;
  createdAt: string;
  residentName: string;
  residentUnit: string;
  residentPhone: string | null;
  managerName: string | null;
  period: string | null;
};

function formatTRY(amount: number) {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    minimumFractionDigits: 0,
  }).format(amount);
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("tr-TR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatPeriod(period: string | null) {
  if (!period) return null;
  return new Date(period).toLocaleString("tr-TR", {
    month: "long",
    year: "numeric",
  });
}

function groupByDate(items: TxItem[]): Record<string, TxItem[]> {
  const groups: Record<string, TxItem[]> = {};
  for (const item of items) {
    const key = formatDate(item.createdAt);
    if (!groups[key]) groups[key] = [];
    groups[key].push(item);
  }
  return groups;
}

export default function KasaPage() {
  const [items, setItems] = useState<TxItem[]>([]);
  const [totalCash, setTotalCash] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/yonetici/kasa");
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
          setItems(json.items ?? []);
          setTotalCash(json.totalCash ?? 0);
        }
      } catch {
        setError("Bağlantı hatası.");
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const groups = groupByDate(items);
  const dateKeys = Object.keys(groups);

  return (
    <div className="space-y-6">
      {/* Başlık */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link
            href="/yonetici"
            className="text-xs text-blue-600 hover:underline"
          >
            ← Panele Dön
          </Link>
          <h1 className="mt-1 text-xl sm:text-2xl font-semibold tracking-tight text-gray-900">
            Kasa Hareketleri
          </h1>
        </div>

        {!isLoading && !error && (
          <div className="bg-white rounded-2xl shadow-sm px-5 py-3 text-right">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
              Toplam Tahsilat
            </p>
            <p className="text-xl font-bold text-green-600 mt-0.5">
              {formatTRY(totalCash)}
            </p>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-sm text-gray-400">
          Yükleniyor...
        </div>
      ) : error ? (
        <div className="py-12 text-center text-sm text-red-600">{error}</div>
      ) : items.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm px-6 py-12 text-center">
          <p className="text-sm text-gray-400">
            Henüz kayıtlı tahsilat bulunmuyor.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {dateKeys.map((dateKey) => (
            <div key={dateKey}>
              {/* Tarih başlığı */}
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2 px-1">
                {dateKey}
              </p>

              <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                <ul className="divide-y divide-gray-100">
                  {groups[dateKey].map((tx, idx) => (
                    <li key={tx.id} className="px-5 py-4">
                      <div className="flex items-start justify-between gap-3">
                        {/* Sol: Timeline dot + bilgi */}
                        <div className="flex items-start gap-3 min-w-0">
                          {/* Timeline dot */}
                          <div className="mt-1 flex-shrink-0">
                            <span
                              className={`inline-flex h-2.5 w-2.5 rounded-full ${
                                tx.method === "CASH"
                                  ? "bg-green-400"
                                  : "bg-blue-400"
                              }`}
                            />
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-sm font-semibold text-gray-900">
                                {tx.residentUnit !== "—"
                                  ? `${tx.residentUnit} — `
                                  : ""}
                                {tx.residentName}
                              </p>
                              <span
                                className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                                  tx.method === "CASH"
                                    ? "bg-gray-100 text-gray-600"
                                    : "bg-blue-50 text-blue-600"
                                }`}
                              >
                                {tx.method === "CASH" ? "Nakit" : "Online"}
                              </span>
                            </div>

                            <div className="mt-0.5 flex items-center gap-2 flex-wrap">
                              <p className="text-xs text-gray-400">
                                {formatTime(tx.createdAt)}
                              </p>
                              {tx.period && (
                                <>
                                  <span className="text-gray-300">·</span>
                                  <p className="text-xs text-gray-400">
                                    {formatPeriod(tx.period)} aidatı
                                  </p>
                                </>
                              )}
                              {tx.managerName && (
                                <>
                                  <span className="text-gray-300">·</span>
                                  <p className="text-xs text-gray-400">
                                    Onaylayan: {tx.managerName}
                                  </p>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Sağ: Tutar */}
                        <div className="flex-shrink-0 text-right">
                          <p className="text-base font-bold text-green-600">
                            +{formatTRY(tx.amountTry)}
                          </p>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>

                {/* Günlük toplam */}
                <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 flex justify-between items-center">
                  <p className="text-xs text-gray-400">
                    {groups[dateKey].length} işlem
                  </p>
                  <p className="text-sm font-semibold text-gray-700">
                    {formatTRY(
                      groups[dateKey].reduce((s, t) => s + t.amountTry, 0)
                    )}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
