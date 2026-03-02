"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

type DueInfo = {
  id: string;
  amountTry: number;
  dueDate: string;
  period: string;
  isPaid: boolean;
  paidAt: string | null;
};

type PageData = {
  due: DueInfo;
  apartment: { name: string };
  resident: { fullName: string; unitLabel: string; phone: string | null };
};

type Stage = "loading" | "form" | "processing" | "success" | "already_paid" | "error";

function formatTRY(n: number) {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    minimumFractionDigits: 2,
  }).format(n);
}

function formatPeriod(p: string | null) {
  if (!p) return "";
  return new Date(p).toLocaleString("tr-TR", { month: "long", year: "numeric" });
}

function formatCardNumber(v: string) {
  return v.replace(/\D/g, "").slice(0, 16).replace(/(\d{4})(?=\d)/g, "$1 ");
}

function formatExpiry(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 4);
  return d.length >= 3 ? d.slice(0, 2) + "/" + d.slice(2) : d;
}

export default function OdemePage() {
  const params = useParams();
  const token = params?.token as string;

  const [stage, setStage] = useState<Stage>("loading");
  const [data, setData] = useState<PageData | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [providerRef, setProviderRef] = useState("");

  const [card, setCard] = useState({
    number: "",
    expiry: "",
    cvc: "",
    name: "",
  });
  const [fieldError, setFieldError] = useState("");

  const loadDue = useCallback(async () => {
    try {
      const res = await fetch(`/api/public/odeme?token=${token}`);
      const json = await res.json();
      if (!res.ok || !json.success) {
        setErrorMsg(json.error ?? "Sayfa yüklenemedi.");
        setStage("error");
        return;
      }
      setData(json);
      setStage(json.due.isPaid ? "already_paid" : "form");
    } catch {
      setErrorMsg("Bağlantı hatası. Lütfen sayfayı yenileyin.");
      setStage("error");
    }
  }, [token]);

  useEffect(() => {
    loadDue();
  }, [loadDue]);

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();
    setFieldError("");

    const cleanCard = card.number.replace(/\s/g, "");
    if (cleanCard.length < 16) {
      setFieldError("Kart numarası 16 haneli olmalıdır.");
      return;
    }
    if (card.expiry.length < 5) {
      setFieldError("Geçerlilik tarihi MM/YY formatında olmalıdır.");
      return;
    }
    if (card.cvc.length < 3) {
      setFieldError("Güvenlik kodu en az 3 haneli olmalıdır.");
      return;
    }
    if (!card.name.trim()) {
      setFieldError("Kart üzerindeki ismi girin.");
      return;
    }

    setStage("processing");

    try {
      const res = await fetch("/api/public/odeme", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          cardNumber: cleanCard,
          expiry: card.expiry,
          cvc: card.cvc,
          cardName: card.name,
        }),
      });
      const json = await res.json();

      if (json.success) {
        setProviderRef(json.providerRef ?? "");
        setStage("success");
      } else {
        setFieldError(json.error ?? "Ödeme işlemi başarısız oldu.");
        setStage("form");
      }
    } catch {
      setFieldError("Bağlantı hatası. Lütfen tekrar deneyin.");
      setStage("form");
    }
  };

  const inputClass =
    "block w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-base text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent focus:bg-white transition-colors";

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-6">
          <span className="flex items-center justify-center rounded-xl bg-blue-600 p-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-5 w-5"
            >
              <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
          </span>
          <span className="text-base font-semibold tracking-tight text-gray-900">
            YVZ Yönetim
          </span>
        </div>

        {/* Loading */}
        {stage === "loading" && (
          <div className="bg-white rounded-2xl shadow-sm px-6 py-12 text-center">
            <p className="text-gray-400 text-sm">Yükleniyor...</p>
          </div>
        )}

        {/* Error */}
        {stage === "error" && (
          <div className="bg-white rounded-2xl shadow-sm px-6 py-10 text-center">
            <div className="text-4xl mb-3">⚠️</div>
            <p className="text-sm font-semibold text-red-600">{errorMsg}</p>
            <p className="text-xs text-gray-400 mt-2">
              Apartman yöneticinizle iletişime geçin.
            </p>
          </div>
        )}

        {/* Already Paid */}
        {stage === "already_paid" && data && (
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="bg-green-500 px-6 py-8 text-center">
              <div className="flex items-center justify-center mb-3">
                <span className="flex items-center justify-center rounded-full bg-white/20 p-3">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="white"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-7 w-7"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </span>
              </div>
              <p className="text-white text-xl font-bold">Ödendi</p>
              <p className="text-white/80 text-sm mt-1">
                Bu aidat daha önce ödenmiştir.
              </p>
            </div>
            <div className="px-6 py-5 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Apartman</span>
                <span className="font-medium text-gray-900">
                  {data.apartment.name}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Daire</span>
                <span className="font-medium text-gray-900">
                  {data.resident.unitLabel}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Dönem</span>
                <span className="font-medium text-gray-900">
                  {formatPeriod(data.due.period)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Tutar</span>
                <span className="font-bold text-gray-900">
                  {formatTRY(data.due.amountTry)}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Payment Form */}
        {(stage === "form" || stage === "processing") && data && (
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            {/* Due summary */}
            <div className="bg-blue-600 px-6 py-6">
              <p className="text-blue-100 text-xs font-semibold uppercase tracking-wider">
                {data.apartment.name}
              </p>
              <p className="text-white font-semibold mt-1">
                {data.resident.unitLabel} — {data.resident.fullName}
              </p>
              <p className="text-blue-100 text-sm mt-0.5">
                {formatPeriod(data.due.period)} Aidat
              </p>
              <p className="text-white text-3xl font-bold mt-3">
                {formatTRY(data.due.amountTry)}
              </p>
            </div>

            <form onSubmit={handlePay} className="px-6 py-6 space-y-4">
              {/* Card number */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Kart Numarası
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="1234 5678 9012 3456"
                  value={card.number}
                  onChange={(e) =>
                    setCard((p) => ({
                      ...p,
                      number: formatCardNumber(e.target.value),
                    }))
                  }
                  maxLength={19}
                  className={inputClass}
                  disabled={stage === "processing"}
                />
              </div>

              {/* Expiry + CVC */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Son Kul. Tarihi
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="MM/YY"
                    value={card.expiry}
                    onChange={(e) =>
                      setCard((p) => ({
                        ...p,
                        expiry: formatExpiry(e.target.value),
                      }))
                    }
                    maxLength={5}
                    className={inputClass}
                    disabled={stage === "processing"}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Güvenlik Kodu
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="CVC"
                    value={card.cvc}
                    onChange={(e) =>
                      setCard((p) => ({
                        ...p,
                        cvc: e.target.value.replace(/\D/g, "").slice(0, 4),
                      }))
                    }
                    maxLength={4}
                    className={inputClass}
                    disabled={stage === "processing"}
                  />
                </div>
              </div>

              {/* Cardholder name */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Kart Üzerindeki İsim
                </label>
                <input
                  type="text"
                  placeholder="AD SOYAD"
                  value={card.name}
                  onChange={(e) =>
                    setCard((p) => ({
                      ...p,
                      name: e.target.value.toUpperCase(),
                    }))
                  }
                  className={inputClass}
                  disabled={stage === "processing"}
                />
              </div>

              {fieldError && (
                <p className="text-xs font-medium text-red-600">{fieldError}</p>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={stage === "processing"}
                className="w-full rounded-xl bg-blue-600 px-4 py-4 text-base font-bold text-white shadow-sm hover:bg-blue-700 disabled:opacity-70 flex items-center justify-center gap-2"
              >
                {stage === "processing" ? (
                  <>
                    <svg
                      className="h-5 w-5 animate-spin"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                      />
                    </svg>
                    İşleniyor...
                  </>
                ) : (
                  <>
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="h-4 w-4"
                    >
                      <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
                      <line x1="1" y1="10" x2="23" y2="10" />
                    </svg>
                    Ödemeyi Tamamla — {formatTRY(data.due.amountTry)}
                  </>
                )}
              </button>

              {/* SSL badge */}
              <div className="flex items-center justify-center gap-1.5 pt-1">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-3.5 w-3.5 text-gray-400"
                >
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                <p className="text-xs text-gray-400">256-bit SSL ile güvenli ödeme</p>
              </div>
            </form>
          </div>
        )}

        {/* Success */}
        {stage === "success" && data && (
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="bg-green-500 px-6 py-8 text-center">
              <div className="flex items-center justify-center mb-3">
                <span className="flex items-center justify-center rounded-full bg-white/20 p-4">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="white"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-8 w-8"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </span>
              </div>
              <p className="text-white text-2xl font-bold">Ödeme Başarılı!</p>
              <p className="text-white/80 text-sm mt-1">
                Aidatınız başarıyla alındı.
              </p>
            </div>

            <div className="px-6 py-5 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Apartman</span>
                <span className="font-medium text-gray-900">
                  {data.apartment.name}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Daire</span>
                <span className="font-medium text-gray-900">
                  {data.resident.unitLabel} — {data.resident.fullName}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Dönem</span>
                <span className="font-medium text-gray-900">
                  {formatPeriod(data.due.period)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Ödenen Tutar</span>
                <span className="font-bold text-green-600">
                  {formatTRY(data.due.amountTry)}
                </span>
              </div>
              {providerRef && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">İşlem No</span>
                  <span className="font-mono text-xs text-gray-400">
                    {providerRef}
                  </span>
                </div>
              )}
            </div>

            <div className="px-6 pb-6 space-y-3">
              {/* WhatsApp receipt */}
              {data.resident.phone && (() => {
                const normalized = data.resident.phone
                  .replace(/\s/g, "")
                  .replace(/^0/, "");
                const full = normalized.startsWith("90")
                  ? normalized
                  : `90${normalized}`;
                const now = new Date().toLocaleDateString("tr-TR");
                const period = formatPeriod(data.due.period);
                const msg =
                  `Sayın ${data.resident.fullName}, ${data.apartment.name} yönetimi olarak ` +
                  `${data.due.amountTry.toLocaleString("tr-TR")} ₺ tutarındaki ${period} aidat ödemeniz ` +
                  `${now} tarihinde online olarak alınmıştır. İşlem No: ${providerRef}. İyi günler dileriz.`;
                return (
                  <a
                    href={`https://wa.me/${full}?text=${encodeURIComponent(msg)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#25D366] px-4 py-3 text-sm font-semibold text-white hover:bg-[#1fba59]"
                  >
                    <svg viewBox="0 0 24 24" className="h-4 w-4 fill-white">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                    </svg>
                    WhatsApp Makbuzu Gönder
                  </a>
                );
              })()}

              <Link
                href="/"
                className="flex w-full items-center justify-center rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Ana Sayfaya Dön
              </Link>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
