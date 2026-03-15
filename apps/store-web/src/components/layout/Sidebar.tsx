'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navLinks = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/dashboard/orders', label: 'Orders' },
  { href: '/dashboard/products', label: 'Products' },
  { href: '/dashboard/payouts', label: 'Payouts' },
  { href: '/dashboard/settings', label: 'Settings' },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <nav className="w-56 bg-gray-900 min-h-screen p-4 flex flex-col shrink-0">
      <div className="text-white font-bold text-lg mb-8 px-2">Cirvia Store</div>
      <ul className="space-y-1">
        {navLinks.map(({ href, label }) => {
          const isActive =
            href === '/dashboard' ? pathname === href : pathname.startsWith(href);
          return (
            <li key={href}>
              <Link
                href={href}
                className={`block px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                }`}
              >
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
