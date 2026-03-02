"use client";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="bg-white shadow-lg rounded-2xl px-6 py-8 sm:px-8 sm:py-10">
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-gray-900 text-center mb-8">
            YVZ Yönetim
          </h1>

          <form className="space-y-6">
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
                className="block w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-base text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
              />
            </div>

            <button
              type="submit"
              className="w-full rounded-lg bg-blue-600 px-4 py-3 text-base font-semibold text-white shadow-sm hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
            >
              Giriş Yap
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}

