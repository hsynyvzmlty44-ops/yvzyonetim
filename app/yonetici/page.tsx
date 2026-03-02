"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type DueInfo = {
  id: string;
  amountTry: number;
  dueDate: string;
  isPaid: boolean;
};

type UnitRow = {
  userId: string;
  unitLabel: string;
  fullName: string;
  phone: string | null;
  due: DueInfo | null;
};

type Stats = {
  totalCash: number;
  thisMonthCash: number;
  pendingAmount: number;
  pendingCount: number;
};

type DashboardData = {
  apartment: { id: string; name: string; unit_count: number | null };
  stats: Stats;
  units: UnitRow[];
  managerName: string;
};

type WhatsappReady = {
  phone: string | null;
  residentName: string;
  apartmentName: string;
  amountTry: number;
};

function formatTRY(amount: number): string {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function buildReceiptLink(info: WhatsappReady): string {
  if (!info.phone) return "#";
  const normalized = info.phone.replace(/\s/g, "").replace(/^0/, "");
  const full = normalized.startsWith("90") ? normalized : `90${normalized}`;
  const now = new Date().toLocaleDateString("tr-TR");
  const month = new Date().toLocaleString("tr-TR", {
    month: "long",
    year: "numeric",
  });
  const msg =
    `Sayın ${info.residentName}, ${info.apartmentName} yönetimi olarak ` +
    `${info.amountTry.toLocaleString("tr-TR")} ₺ tutarındaki ${month} aidat ödemeniz ` +
    `${now} tarihinde elden teslim alınmıştır. İyi günler dileriz.`;
  return `https://wa.me/${full}?text=${encodeURIComponent(msg)}`;
}

export default function YoneticiPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);
  const [loadingDueId, setLoadingDueId] = useState<string | null>(null);
  const [whatsappReady, setWhatsappReady] = useState<
    Record<string, WhatsappReady>
  >({});
  const [toast, setToast] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setPageError(null);
    try {
      const res = await fetch("/api/yonetici/dashboard");
      const text = await res.text();
      let json: any = {};
      try {
        json = text ? JSON.parse(text) : {};
      } catch {
        setPageError("Sunucu geçersiz yanıt döndü.");
        return;
      }
      if (!res.ok || !json.success) {
        setPageError(json.error ?? "Veriler yüklenemedi.");
      } else {
        setData(json);
      }
    } catch {
      setPageError("Bağlantı hatası. Lütfen sayfayı yenileyin.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  const handleCashCollect = async (unit: UnitRow) => {
    const due = unit.due;
    if (!due || loadingDueId) return;
    setLoadingDueId(due.id);
    try {
      const res = await fetch("/api/yonetici/tahsilat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dueId: due.id }),
      });
      const text = await res.text();
      let json: any = {};
      try {
        json = text ? JSON.parse(text) : {};
      } catch {}

      if (json.success) {
        setToast({ type: "success", message: "Nakit tahsilat kaydedildi." });

        // Mark WhatsApp button ready for this unit
        setWhatsappReady((prev) => ({
          ...prev,
          [due.id]: {
            phone: unit.phone,
            residentName: unit.fullName,
            apartmentName: data?.apartment.name ?? "",
            amountTry: due.amountTry,
          },
        }));

        setData((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            units: prev.units.map((u) =>
              u.due?.id === due.id
                ? { ...u, due: { ...u.due, isPaid: true } }
                : u
            ),
            stats: {
              ...prev.stats,
              totalCash: prev.stats.totalCash + due.amountTry,
              thisMonthCash: prev.stats.thisMonthCash + due.amountTry,
              pendingAmount: prev.stats.pendingAmount - due.amountTry,
              pendingCount: prev.stats.pendingCount - 1,
            },
          };
        });
      } else {
        setToast({
          type: "error",
          message: json.error ?? "İşlem başarısız.",
        });
      }
    } catch {
      setToast({ type: "error", message: "Bağlantı hatası." });
    } finally {
      setLoadingDueId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <p className="text-gray-400 text-sm">Yükleniyor...</p>
      </div>
    );
  }

  if (pageError) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <p className="text-red-600 text-sm font-medium">{pageError}</p>
        <button
          onClick={loadData}
          className="text-sm text-blue-600 hover:underline"
        >
          Tekrar Dene
        </button>
      </div>
    );
  }

  if (!data) return null;

  return (
    <>
      <div className="space-y-5">
        {/* Başlık + Kasa Hareketleri linki */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-gray-900">
              {data.apartment.name}
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Hoş geldiniz,{" "}
              <span className="font-medium text-gray-700">
                {data.managerName}
              </span>
            </p>
          </div>
          <Link
            href="/yonetici/kasa"
            className="self-start inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 shadow-sm hover:bg-gray-50 whitespace-nowrap"
          >
            <span>📋</span> Kasa Hareketleri
          </Link>
        </div>

        {/* İlerleme çubuğu */}
        {(() => {
          const unitsWithDue = data.units.filter((u) => u.due);
          const paidCount = unitsWithDue.filter((u) => u.due?.isPaid).length;
          const total = unitsWithDue.length;
          const pct = total > 0 ? Math.round((paidCount / total) * 100) : 0;
          if (total === 0) return null;
          return (
            <div className="bg-white rounded-2xl shadow-sm px-5 py-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-semibold text-gray-900">
                  Bu Ay Tahsilat Durumu
                </p>
                <p className="text-sm font-semibold text-gray-700">
                  {paidCount}/{total} daire
                </p>
              </div>
              <div className="h-3 w-full rounded-full bg-gray-100 overflow-hidden">
                <div
                  className={`h-3 rounded-full transition-all duration-700 ${
                    pct >= 75
                      ? "bg-green-500"
                      : pct >= 40
                      ? "bg-amber-400"
                      : "bg-red-400"
                  }`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <div className="flex items-center justify-between mt-1.5">
                <p className="text-xs text-gray-400">
                  {total - paidCount} daire bekliyor
                </p>
                <p className="text-xs font-medium text-gray-500">
                  %{pct} ödendi
                </p>
              </div>
            </div>
          );
        })()}

        {/* Stat kartları */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="bg-white rounded-2xl shadow-sm px-5 py-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
              Toplam Kasa
            </p>
            <p className="mt-2 text-2xl font-bold text-gray-900">
              {formatTRY(data.stats.totalCash)}
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-sm px-5 py-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
              Bu Ay Toplanan
            </p>
            <p className="mt-2 text-2xl font-bold text-green-600">
              {formatTRY(data.stats.thisMonthCash)}
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-sm px-5 py-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
              Bekleyen Aidat
            </p>
            <p className="mt-2 text-2xl font-bold text-red-500">
              {formatTRY(data.stats.pendingAmount)}
            </p>
            {data.stats.pendingCount > 0 && (
              <p className="mt-0.5 text-xs text-gray-400">
                {data.stats.pendingCount} daire bekliyor
              </p>
            )}
          </div>
        </div>

        {/* Daire listesi */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="text-base font-semibold text-gray-900">Daireler</h2>
          </div>

          {data.units.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <p className="text-sm text-gray-400">
                Bu apartmana henüz sakin eklenmemiş.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {data.units.map((unit) => (
                <li key={unit.userId} className="px-5 py-4">
                  <div className="flex items-start justify-between gap-3">
                    {/* Sol: isim + aidat bilgisi */}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-gray-900">
                        {unit.unitLabel !== "—" ? `${unit.unitLabel} — ` : ""}
                        {unit.fullName}
                      </p>
                      {unit.due ? (
                        <p className="text-xs text-gray-400 mt-0.5">
                          {formatTRY(unit.due.amountTry)} · Son ödeme:{" "}
                          {new Date(unit.due.dueDate).toLocaleDateString(
                            "tr-TR"
                          )}
                        </p>
                      ) : (
                        <p className="text-xs text-gray-400 mt-0.5">
                          Bu ay için aidat tanımlanmamış
                        </p>
                      )}
                    </div>

                    {/* Sağ: aksiyon butonu */}
                    <div className="flex-shrink-0 flex flex-col items-end gap-2">
                      {unit.due?.isPaid ? (
                        <>
                          <span className="inline-flex items-center rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">
                            Ödedi
                          </span>
                          {unit.due.id && whatsappReady[unit.due.id] && (
                            <a
                              href={buildReceiptLink(
                                whatsappReady[unit.due.id]
                              )}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 rounded-lg bg-[#25D366] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#1fba59] whitespace-nowrap"
                            >
                              <svg
                                viewBox="0 0 24 24"
                                className="h-3.5 w-3.5 fill-white"
                              >
                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                              </svg>
                              Makbuz Gönder
                            </a>
                          )}
                        </>
                      ) : unit.due ? (
                        <button
                          type="button"
                          onClick={() => handleCashCollect(unit)}
                          disabled={loadingDueId === unit.due.id}
                          className="inline-flex items-center justify-center rounded-lg bg-gray-900 px-3 py-2 text-xs font-semibold text-white hover:bg-gray-700 disabled:opacity-50 whitespace-nowrap"
                        >
                          {loadingDueId === unit.due.id
                            ? "..."
                            : "Elden Nakit Aldım"}
                        </button>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-400">
                          Tanımsız
                        </span>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-4 right-4 z-40">
          <div
            className={`rounded-xl border px-4 py-3 text-sm shadow-lg bg-white ${
              toast.type === "success"
                ? "border-green-200 text-green-800"
                : "border-red-200 text-red-800"
            }`}
          >
            {toast.message}
          </div>
        </div>
      )}
    </>
  );
}
