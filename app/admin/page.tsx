"use client";

import type React from "react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/src/lib/supabase";

type MonthStats = {
  totalDues: number;
  paidDues: number;
  pendingDues: number;
};

type ApartmentRow = {
  id: string;
  name: string;
  unitCount: number | null;
  managerName: string | null;
  managerPhone: string | null;
};

type ToastState = {
  type: "success" | "error";
  message: string;
};

export default function AdminDashboardPage() {
  const [apartments, setApartments] = useState<ApartmentRow[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [monthStats, setMonthStats] = useState<MonthStats | null>(null);

  const [form, setForm] = useState({
    name: "",
    unitCount: "",
    managerName: "",
    managerPhone: "",
  });

  const loadApartments = useCallback(async () => {
    setIsLoading(true);

    const { data: apartmentData, error: apartmentsError } = await supabase
      .from("apartments")
      .select("id, name, unit_count, manager_user_id")
      .order("created_at", { ascending: false });

    if (apartmentsError || !apartmentData) {
      setApartments([]);
      setIsLoading(false);
      setToast({
        type: "error",
        message: "Apartmanlar yüklenirken bir hata oluştu.",
      });
      return;
    }

    const managerIds = apartmentData
      .map((a: any) => a.manager_user_id)
      .filter(Boolean);

    let managersById: Record<
      string,
      { full_name: string; phone: string | null }
    > = {};

    if (managerIds.length > 0) {
      const { data: managerData, error: managersError } = await supabase
        .from("users")
        .select("id, full_name, phone")
        .in("id", managerIds);

      if (!managersError && managerData) {
        managersById = managerData.reduce(
          (
            acc: Record<string, { full_name: string; phone: string | null }>,
            user: any
          ) => {
            acc[user.id] = {
              full_name: user.full_name,
              phone: user.phone ?? null,
            };
            return acc;
          },
          {}
        );
      }
    }

    const rows: ApartmentRow[] = apartmentData.map((apt: any) => {
      const manager =
        apt.manager_user_id && managersById[apt.manager_user_id]
          ? managersById[apt.manager_user_id]
          : null;

      return {
        id: apt.id,
        name: apt.name,
        unitCount: apt.unit_count ?? null,
        managerName: manager?.full_name ?? null,
        managerPhone: manager?.phone ?? null,
      };
    });

    setApartments(rows);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadApartments();
    fetch("/api/admin/stats")
      .then((r) => r.json())
      .then((d) => { if (d.success) setMonthStats(d); })
      .catch(() => {});
  }, [loadApartments]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleCreateApartment = async (
    e: React.FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();
    if (isSaving) return;

    if (
      !form.name.trim() ||
      !form.unitCount.trim() ||
      !form.managerName.trim() ||
      !form.managerPhone.trim()
    ) {
      setToast({
        type: "error",
        message: "Lütfen tüm alanları doldurun.",
      });
      return;
    }

    setIsSaving(true);
    setToast(null);

    const unitCountNumber = Number(form.unitCount.replace(",", "."));

    try {
      const res = await fetch("/api/admin/apartments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          unitCount: isNaN(unitCountNumber) ? 0 : unitCountNumber,
          managerName: form.managerName.trim(),
          managerPhone: form.managerPhone.trim(),
        }),
      });

      const text = await res.text();
      let data: { success?: boolean; error?: string; apartment?: ApartmentRow } = {};
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        setToast({
          type: "error",
          message: "Sunucu HTML döndü. .env.local içinde SUPABASE_SERVICE_ROLE_KEY tanımlı mı kontrol et.",
        });
        return;
      }

      if (!res.ok) {
        setToast({
          type: "error",
          message: data?.error ?? "İşlem sırasında bir hata oluştu.",
        });
        return;
      }

      if (data.success && data.apartment) {
        const newRow: ApartmentRow = {
          id: data.apartment.id,
          name: data.apartment.name,
          unitCount: data.apartment.unitCount ?? null,
          managerName: data.apartment.managerName ?? null,
          managerPhone: data.apartment.managerPhone ?? null,
        };
        setApartments((prev) => [newRow, ...prev]);
        setIsModalOpen(false);
        setForm({ name: "", unitCount: "", managerName: "", managerPhone: "" });
        setToast({ type: "success", message: "Apartman başarıyla eklendi." });
      } else {
        setToast({
          type: "error",
          message: data?.error ?? "İşlem sırasında bir hata oluştu.",
        });
      }
    } catch (error) {
      console.error(error);
      const message =
        error instanceof Error ? error.message : "İşlem sırasında bir hata oluştu.";
      setToast({ type: "error", message });
    } finally {
      setIsSaving(false);
    }
  };

  const progressPct =
    monthStats && monthStats.totalDues > 0
      ? Math.round((monthStats.paidDues / monthStats.totalDues) * 100)
      : 0;

  return (
    <>
      <div className="space-y-6">
        {/* Aylık ilerleme çubuğu */}
        {monthStats && monthStats.totalDues > 0 && (
          <div className="bg-white rounded-2xl shadow-sm px-5 py-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-semibold text-gray-900">
                Bu Ay Genel Tahsilat Durumu
              </p>
              <p className="text-sm font-semibold text-gray-700">
                {monthStats.paidDues}/{monthStats.totalDues} daire
              </p>
            </div>
            <div className="h-3 w-full rounded-full bg-gray-100 overflow-hidden">
              <div
                className={`h-3 rounded-full transition-all duration-700 ${
                  progressPct >= 75
                    ? "bg-green-500"
                    : progressPct >= 40
                    ? "bg-amber-400"
                    : "bg-red-400"
                }`}
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <div className="flex items-center justify-between mt-1.5">
              <p className="text-xs text-gray-400">
                {monthStats.pendingDues} daire bekliyor
              </p>
              <p className="text-xs font-medium text-gray-500">
                %{progressPct} ödendi
              </p>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-gray-900">
            Kayıtlı Apartmanlar
          </h1>
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
          >
            + Yeni Apartman Ekle
          </button>
        </div>

        <div className="mt-4 overflow-x-auto">
          <div className="inline-block min-w-full align-middle">
            <div className="overflow-hidden rounded-xl bg-white shadow-sm">
              <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 font-medium text-gray-600">
                      Apartman Adı
                    </th>
                    <th className="px-4 py-3 font-medium text-gray-600">
                      Yönetici Adı
                    </th>
                    <th className="px-4 py-3 font-medium text-gray-600 whitespace-nowrap">
                      Yönetici Telefonu
                    </th>
                    <th className="px-4 py-3 font-medium text-gray-600 whitespace-nowrap">
                      Daire Sayısı
                    </th>
                    <th className="px-4 py-3 font-medium text-gray-600">
                      İşlemler
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {isLoading ? (
                    <tr>
                      <td
                        className="px-4 py-6 text-center text-gray-500"
                        colSpan={5}
                      >
                        Yükleniyor...
                      </td>
                    </tr>
                  ) : apartments.length === 0 ? (
                    <tr>
                      <td
                        className="px-4 py-6 text-center text-gray-500"
                        colSpan={5}
                      >
                        Henüz kayıtlı apartman bulunmuyor.
                      </td>
                    </tr>
                  ) : (
                    apartments.map((apt) => (
                      <tr key={apt.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-gray-900">
                          <div className="text-sm font-medium">{apt.name}</div>
                        </td>
                        <td className="px-4 py-3 text-gray-900">
                          <div className="text-sm">
                            {apt.managerName ?? "—"}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-900 whitespace-nowrap">
                          <div className="text-sm">
                            {apt.managerPhone ?? "—"}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-900 whitespace-nowrap">
                          <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700">
                            {apt.unitCount ?? "—"} daire
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-900">
                          <Link
                            href={`/admin/${apt.id}`}
                            className="text-sm font-medium text-blue-600 hover:text-blue-700 whitespace-nowrap"
                          >
                            Sakinleri Yönet →
                          </Link>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/30 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-xl">
            <div className="border-b border-gray-100 px-6 py-4">
              <h2 className="text-lg font-semibold tracking-tight text-gray-900">
                Yeni Apartman Ekle
              </h2>
            </div>
            <form
              onSubmit={handleCreateApartment}
              className="px-6 py-5 space-y-4"
            >
              <div className="space-y-1.5">
                <label
                  htmlFor="name"
                  className="block text-sm font-medium text-gray-700"
                >
                  Apartman Adı
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  value={form.name}
                  onChange={handleChange}
                  className="block w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                  placeholder="Örn: YVZ Rezidans A Blok"
                />
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="unitCount"
                  className="block text-sm font-medium text-gray-700"
                >
                  Daire Sayısı
                </label>
                <input
                  id="unitCount"
                  name="unitCount"
                  type="number"
                  min={1}
                  value={form.unitCount}
                  onChange={handleChange}
                  className="block w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                  placeholder="Örn: 24"
                />
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="managerName"
                  className="block text-sm font-medium text-gray-700"
                >
                  Yönetici Adı Soyadı
                </label>
                <input
                  id="managerName"
                  name="managerName"
                  type="text"
                  value={form.managerName}
                  onChange={handleChange}
                  className="block w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                  placeholder="Örn: Ahmet Yılmaz"
                />
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="managerPhone"
                  className="block text-sm font-medium text-gray-700"
                >
                  Yönetici Telefonu
                </label>
                <input
                  id="managerPhone"
                  name="managerPhone"
                  type="tel"
                  value={form.managerPhone}
                  onChange={handleChange}
                  className="block w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                  placeholder="05XX XXX XX XX"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  disabled={isSaving}
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-70"
                  disabled={isSaving}
                >
                  {isSaving ? "Kaydediliyor..." : "Kaydet"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-4 right-4 z-40">
          <div
            className={`rounded-lg border px-4 py-3 text-sm shadow-lg bg-white ${
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

