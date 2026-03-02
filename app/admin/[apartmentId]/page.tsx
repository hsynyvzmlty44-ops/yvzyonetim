"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

type CurrentDue = {
  id: string;
  amountTry: number;
  dueDate: string;
  isPaid?: boolean;
};

type ResidentRow = {
  id: string;
  fullName: string;
  phone: string | null;
  unitLabel: string;
  isActive: boolean;
  currentDue: CurrentDue | null;
};

type ApartmentInfo = {
  id: string;
  name: string;
  unit_count: number | null;
};

type PageData = {
  apartment: ApartmentInfo;
  residents: ResidentRow[];
};

type ToastState = { type: "success" | "error"; message: string };

const emptyForm = {
  fullName: "",
  unitLabel: "",
  phone: "",
  monthlyAmount: "",
};

export default function ApartmentResidentsPage() {
  const params = useParams();
  const apartmentId = params?.apartmentId as string;

  const [data, setData] = useState<PageData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [toast, setToast] = useState<ToastState | null>(null);

  const loadData = useCallback(async () => {
    if (!apartmentId) return;
    setIsLoading(true);
    setPageError(null);
    try {
      const res = await fetch(
        `/api/admin/residents?apartmentId=${apartmentId}`
      );
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
        setData({ apartment: json.apartment, residents: json.residents });
      }
    } catch {
      setPageError("Bağlantı hatası.");
    } finally {
      setIsLoading(false);
    }
  }, [apartmentId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;

    const amount = Number(form.monthlyAmount.replace(",", "."));
    if (
      !form.fullName.trim() ||
      !form.unitLabel.trim() ||
      !form.phone.trim() ||
      isNaN(amount) ||
      amount <= 0
    ) {
      setToast({ type: "error", message: "Lütfen tüm alanları doldurun." });
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch("/api/admin/residents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apartmentId,
          fullName: form.fullName.trim(),
          unitLabel: form.unitLabel.trim(),
          phone: form.phone.trim(),
          monthlyAmount: amount,
        }),
      });

      const text = await res.text();
      let json: any = {};
      try {
        json = text ? JSON.parse(text) : {};
      } catch {
        setToast({
          type: "error",
          message: "Sunucu geçersiz yanıt döndü.",
        });
        return;
      }

      if (!res.ok || !json.success) {
        setToast({
          type: "error",
          message: json.error ?? "İşlem başarısız.",
        });
        return;
      }

      const newResident: ResidentRow = {
        ...json.resident,
        isActive: true,
      };

      setData((prev) =>
        prev
          ? {
              ...prev,
              residents: [...prev.residents, newResident].sort((a, b) =>
                a.unitLabel.localeCompare(b.unitLabel, "tr")
              ),
            }
          : prev
      );

      setIsModalOpen(false);
      setForm(emptyForm);

      const msg = json.warning
        ? `Sakin eklendi. Uyarı: ${json.warning}`
        : "Sakin başarıyla eklendi ve bu ayın aidat borcu oluşturuldu.";
      setToast({ type: json.warning ? "error" : "success", message: msg });
    } catch {
      setToast({ type: "error", message: "Bağlantı hatası." });
    } finally {
      setIsSaving(false);
    }
  };

  const formatTRY = (amount: number) =>
    new Intl.NumberFormat("tr-TR", {
      style: "currency",
      currency: "TRY",
      minimumFractionDigits: 0,
    }).format(amount);

  function buildReminderLink(
    phone: string | null,
    residentName: string,
    apartmentName: string,
    amountTry: number,
    dueDate: string
  ): string {
    if (!phone) return "#";
    const normalized = phone.replace(/\s/g, "").replace(/^0/, "");
    const full = normalized.startsWith("90") ? normalized : `90${normalized}`;
    const month = new Date().toLocaleString("tr-TR", {
      month: "long",
      year: "numeric",
    });
    const dueDateFormatted = new Date(dueDate).toLocaleDateString("tr-TR");
    const msg =
      `Sayın ${residentName}, ${apartmentName} yönetiminden bilginize: ` +
      `${amountTry.toLocaleString("tr-TR")} ₺ tutarındaki ${month} aidat ödemeniz ` +
      `henüz yapılmamıştır. Son ödeme tarihi: ${dueDateFormatted}. Bilginize sunarız.`;
    return `https://wa.me/${full}?text=${encodeURIComponent(msg)}`;
  }

  return (
    <>
      <div className="space-y-6">
        {/* Başlık + geri */}
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Link
              href="/admin"
              className="text-xs text-blue-600 hover:underline"
            >
              ← Admin Paneline Dön
            </Link>
            <h1 className="mt-1 text-xl sm:text-2xl font-semibold tracking-tight text-gray-900">
              {isLoading ? "Yükleniyor..." : (data?.apartment.name ?? "Apartman")}
            </h1>
            <p className="text-sm text-gray-500">Sakin Yönetimi</p>
          </div>
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="self-start sm:self-auto inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
          >
            + Yeni Sakin Ekle
          </button>
        </div>

        {/* İçerik */}
        {isLoading ? (
          <div className="py-12 text-center text-sm text-gray-400">
            Yükleniyor...
          </div>
        ) : pageError ? (
          <div className="py-12 text-center text-sm text-red-600">
            {pageError}
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-base font-semibold text-gray-900">
                Kayıtlı Sakinler
              </h2>
              <span className="text-xs text-gray-400">
                {data?.residents.length ?? 0} sakin
              </span>
            </div>

            {!data?.residents.length ? (
              <div className="px-5 py-10 text-center text-sm text-gray-400">
                Henüz sakin kaydı yok. "+ Yeni Sakin Ekle" butonunu kullanın.
              </div>
            ) : (
              <ul className="divide-y divide-gray-100">
                  {data.residents.map((r) => (
                  <li key={r.id} className="px-5 py-4 flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-gray-900">
                        {r.unitLabel}{" "}
                        <span className="font-normal text-gray-600">
                          — {r.fullName}
                        </span>
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {r.phone ?? "Telefon yok"}
                      </p>
                    </div>

                    <div className="flex-shrink-0 flex flex-col items-end gap-2">
                      {r.currentDue ? (
                        <>
                          <div className="text-right">
                            <p className="text-sm font-semibold text-gray-900">
                              {formatTRY(r.currentDue.amountTry)}
                            </p>
                            <p className="text-xs text-gray-400">
                              Son:{" "}
                              {new Date(r.currentDue.dueDate).toLocaleDateString("tr-TR")}
                            </p>
                          </div>

                          {r.currentDue.isPaid ? (
                            <span className="inline-flex items-center rounded-full bg-green-50 px-2.5 py-1 text-xs font-semibold text-green-700">
                              Ödedi
                            </span>
                          ) : (
                            <a
                              href={buildReminderLink(
                                r.phone,
                                r.fullName,
                                data.apartment.name,
                                r.currentDue.amountTry,
                                r.currentDue.dueDate
                              )}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-white whitespace-nowrap ${
                                r.phone
                                  ? "bg-[#25D366] hover:bg-[#1fba59]"
                                  : "bg-gray-300 cursor-not-allowed pointer-events-none"
                              }`}
                            >
                              <svg viewBox="0 0 24 24" className="h-3 w-3 fill-white flex-shrink-0">
                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                              </svg>
                              Borç Hatırlat
                            </a>
                          )}
                        </>
                      ) : (
                        <span className="text-xs text-gray-400">Aidat yok</span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/30 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-xl">
            <div className="border-b border-gray-100 px-6 py-4">
              <h2 className="text-lg font-semibold tracking-tight text-gray-900">
                Yeni Sakin Ekle
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">
                Sakin eklendikten sonra bu ayın borcu otomatik oluşturulur.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
              <div className="space-y-1.5">
                <label
                  htmlFor="fullName"
                  className="block text-sm font-medium text-gray-700"
                >
                  Ad Soyad
                </label>
                <input
                  id="fullName"
                  name="fullName"
                  type="text"
                  value={form.fullName}
                  onChange={handleChange}
                  placeholder="Örn: Fatma Kaya"
                  className="block w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                />
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="unitLabel"
                  className="block text-sm font-medium text-gray-700"
                >
                  Daire No
                </label>
                <input
                  id="unitLabel"
                  name="unitLabel"
                  type="text"
                  value={form.unitLabel}
                  onChange={handleChange}
                  placeholder="Örn: Daire 5 veya 3/A"
                  className="block w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                />
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="phone"
                  className="block text-sm font-medium text-gray-700"
                >
                  Telefon
                </label>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  value={form.phone}
                  onChange={handleChange}
                  placeholder="05XX XXX XX XX"
                  className="block w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                />
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="monthlyAmount"
                  className="block text-sm font-medium text-gray-700"
                >
                  Aylık Aidat Tutarı (₺)
                </label>
                <input
                  id="monthlyAmount"
                  name="monthlyAmount"
                  type="number"
                  min={1}
                  value={form.monthlyAmount}
                  onChange={handleChange}
                  placeholder="Örn: 750"
                  className="block w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    setForm(emptyForm);
                  }}
                  disabled={isSaving}
                  className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-70"
                >
                  {isSaving ? "Kaydediliyor..." : "Kaydet"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-4 right-4 z-40">
          <div
            className={`rounded-xl border px-4 py-3 text-sm shadow-lg bg-white max-w-xs ${
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
