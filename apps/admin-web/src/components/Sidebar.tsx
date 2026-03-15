'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import clsx from 'clsx';
import { clearAuth } from '@/lib/auth';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Overview' },
  { href: '/dashboard/users', label: 'Users' },
  { href: '/dashboard/stores', label: 'Stores' },
  { href: '/dashboard/orders', label: 'Orders' },
  { href: '/dashboard/drivers', label: 'Drivers' },
  { href: '/dashboard/payouts', label: 'Payouts' },
  { href: '/dashboard/reviews', label: 'Reviews' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = () => {
    clearAuth();
    router.push('/login');
  };

  return (
    <aside className="w-56 min-h-screen bg-white border-r flex flex-col shrink-0">
      <div className="px-5 py-5 border-b">
        <span className="font-bold text-lg">Cirvia Admin</span>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV_ITEMS.map(({ href, label }) => {
          const isActive =
            href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={clsx(
                'block px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              )}
            >
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="px-3 py-4 border-t">
        <button
          onClick={handleLogout}
          className="w-full text-left px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors"
        >
          Logout
        </button>
      </div>
    </aside>
  );
}
