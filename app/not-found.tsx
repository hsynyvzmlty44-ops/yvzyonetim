import Link from 'next/link';

export default function NotFound() {
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
        {/* Error code */}
        <span className="text-7xl font-black text-gray-100 select-none leading-none mb-4">
          404
        </span>

        <h1 className="text-xl font-bold text-gray-900 mb-2">
          Sayfa bulunamadı
        </h1>
        <p className="text-sm text-gray-500 leading-relaxed mb-8">
          Aradığın sayfa taşınmış, silinmiş ya da hiç var olmamış olabilir.
        </p>

        <Link
          href="/"
          className="w-full bg-gray-900 text-white text-sm font-medium py-3 rounded-xl hover:bg-gray-700 transition text-center"
        >
          Ana Sayfaya Dön
        </Link>
      </div>

      <p className="mt-8 text-xs text-gray-400">
        YVZ Yönetim &copy; {new Date().getFullYear()}
      </p>
    </div>
  );
}
