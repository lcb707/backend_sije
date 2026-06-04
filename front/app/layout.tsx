import type { Metadata } from 'next';
import './globals.css';
import { Navbar } from '@/components/layout/Navbar';
import { UserProvider } from '@/contexts/UserContext';

export const metadata: Metadata = {
  title: '발주서 변경 승인 — 테스트 UI',
  description: '발주서 변경 승인 프로세스 백엔드 테스트용 프론트엔드',
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="min-h-full bg-gray-50">
        <UserProvider>
          <Navbar />
          <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
        </UserProvider>
      </body>
    </html>
  );
}
