import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Cirvia — Store Dashboard',
  description: 'Manage your store inventory, orders, and payouts',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
