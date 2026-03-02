'use client';

import { useState, useEffect, useCallback } from 'react';

interface SuperAdmin {
  id: string;
  fullName: string;
  phone: string;
  isActive: boolean;
  createdAt: string;
}

export default function EkipPage() {
  const [admins, setAdmins] = useState<SuperAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ fullName: '', phone: '' });
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'ok' | 'err' } | null>(null);

  const showToast = (msg: string, type: 'ok' | 'err') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchAdmins = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/superadmins');
      const text = await res.text();
      let data: any;
      try { data = JSON.parse(text); } catch { throw new Error(text.slice(0, 120)); }
      if (!data.success) throw new Error(data.error ?? 'Bilinmeyen hata.');
      setAdmins(data.superAdmins ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Yüklenirken hata oluştu.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAdmins(); }, [fetchAdmins]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.fullName.trim() || !form.phone.trim()) {
      showToast('Ad Soyad ve Telefon zorunludur.', 'err');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/admin/superadmins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName: form.fullName, phone: form.phone }),
      });
      const text = await res.text();
      let data: any;
      try { data = JSON.parse(text); } catch { throw new Error(text.slice(0, 120)); }
      if (!data.success) throw new Error(data.error ?? 'Kayıt başarısız.');
      showToast(`${data.superAdmin.fullName} eklendi!`, 'ok');
      setShowModal(false);
      setForm({ fullName: '', phone: '' });
      fetchAdmins();
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Beklenmeyen hata.', 'err');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-5 right-5 z-50 px-5 py-3 rounded-xl shadow-lg text-sm font-medium text-white transition-all ${
            toast.type === 'ok' ? 'bg-green-500' : 'bg-red-500'
          }`}
        >
          {toast.msg}
        </div>
      )}

      <div className="mx-auto max-w-3xl px-4 sm:px-6 py-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Yönetici Ekibi</h1>
            <p className="text-sm text-gray-500 mt-1">
              Sisteme erişimi olan Süper Adminler
            </p>
          </div>
          <button
            onClick={() => { setForm({ fullName: '', phone: '' }); setShowModal(true); }}
            className="inline-flex items-center gap-2 bg-gray-900 text-white text-sm font-medium px-4 py-2.5 rounded-xl hover:bg-gray-700 transition"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Yeni Yönetici Ekle
          </button>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-4 border-gray-200 border-t-gray-800 rounded-full animate-spin" />
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-5 text-sm">
            <strong>Hata:</strong> {error}
          </div>
        ) : admins.length === 0 ? (
          <div className="text-center py-20 text-gray-400 text-sm">
            Henüz hiç yönetici eklenmemiş.
          </div>
        ) : (
          <div className="space-y-3">
            {admins.map((a, i) => (
              <div
                key={a.id}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4 flex items-center gap-4"
              >
                {/* Avatar */}
                <div className="w-11 h-11 rounded-full bg-gray-900 text-white flex items-center justify-center text-base font-bold flex-shrink-0">
                  {a.fullName.charAt(0).toUpperCase()}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-gray-900 text-sm">
                      {a.fullName}
                    </span>
                    {i === 0 && (
                      <span className="text-xs bg-yellow-100 text-yellow-700 font-medium px-2 py-0.5 rounded-full">
                        Kurucu
                      </span>
                    )}
                    <span
                      className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        a.isActive
                          ? 'bg-green-50 text-green-600'
                          : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {a.isActive ? 'Aktif' : 'Pasif'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5 font-mono">{a.phone}</p>
                </div>

                {/* Date */}
                <div className="text-xs text-gray-400 text-right flex-shrink-0">
                  {new Date(a.createdAt).toLocaleDateString('tr-TR')}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100">
              <h2 className="text-base font-semibold text-gray-900">Yeni Yönetici Ekle</h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600 transition"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSave} className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">
                  Ad Soyad
                </label>
                <input
                  type="text"
                  placeholder="Ahmet Yılmaz"
                  value={form.fullName}
                  onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-800 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">
                  Telefon Numarası
                </label>
                <input
                  type="tel"
                  placeholder="05xxxxxxxxx"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-800 focus:border-transparent"
                />
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 border border-gray-200 text-gray-600 text-sm font-medium py-3 rounded-xl hover:bg-gray-50 transition"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-gray-900 text-white text-sm font-medium py-3 rounded-xl hover:bg-gray-700 disabled:opacity-50 transition"
                >
                  {saving ? 'Kaydediliyor…' : 'Kaydet'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
