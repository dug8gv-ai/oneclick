import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Ludo Web3',
  description: 'Web3 Ludo foundation with wallet authentication'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
