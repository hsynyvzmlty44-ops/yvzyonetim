'use client';

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Production'da hata loglama servisi burada tetiklenebilir
    console.error('[YVZ Error]', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
      {/* Logo */}
      <div className="flex items-center gap-2.5 mb-10">
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
        <span className="text-lg font-semibold tracking-tight text-gray-900">
          YVZ Yönetim
        </span>
      </div>

      {/* Card */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 px-10 py-12 flex flex-col items-center text-center max-w-sm w-full">
        {/* Icon */}
        <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mb-5">
          <svg
            className="w-7 h-7 text-red-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
            />
          </svg>
        </div>

        <h1 className="text-xl font-bold text-gray-900 mb-2">
          Beklenmedik Bir Hata
        </h1>
        <p className="text-sm text-gray-500 leading-relaxed mb-1">
          Sistemde geçici bir sorun oluştu. Lütfen tekrar dene.
        </p>
        {error.digest && (
          <p className="text-xs text-gray-300 font-mono mb-6">
            Hata kodu: {error.digest}
          </p>
        )}

        <div className="flex gap-3 w-full mt-4">
          <button
            onClick={reset}
            className="flex-1 bg-gray-900 text-white text-sm font-medium py-3 rounded-xl hover:bg-gray-700 transition"
          >
            Tekrar Dene
          </button>
          <a
            href="/"
            className="flex-1 border border-gray-200 text-gray-600 text-sm font-medium py-3 rounded-xl hover:bg-gray-50 transition text-center"
          >
            Ana Sayfa
          </a>
        </div>
      </div>

      <p className="mt-8 text-xs text-gray-400">
        YVZ Yönetim &copy; {new Date().getFullYear()}
      </p>
    </div>
  );
}
