'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const tabs = [
  { href: '/admin', label: 'Apartmanlar' },
  { href: '/admin/ekip', label: 'Yönetici Ekibi' },
];

export default function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="bg-white border-b border-gray-100">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 flex gap-1">
        {tabs.map((tab) => {
          const isActive =
            tab.href === '/admin'
              ? pathname === '/admin'
              : pathname.startsWith(tab.href);

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`relative px-4 py-3 text-sm font-medium transition-colors ${
                isActive
                  ? 'text-gray-900'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
              {isActive && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-900 rounded-t-full" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
