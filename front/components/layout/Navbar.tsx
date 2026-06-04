'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { UserSelector } from './UserSelector';

export function Navbar() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 border-b border-gray-200 bg-white shadow-sm">
      <div className="mx-auto max-w-5xl px-4">
        <div className="flex h-14 items-center justify-between">
          {/* 로고 */}
          <Link href="/" className="flex items-center gap-2">
            <span className="text-lg font-bold text-gray-900">발주서 관리</span>
            <span className="rounded bg-blue-600 px-1.5 py-0.5 text-xs text-white font-medium">
              테스트
            </span>
          </Link>

          {/* 내비 링크 */}
          <nav className="hidden md:flex items-center gap-1">
            <NavLink href="/" label="발주서 목록" active={pathname === '/'} />
          </nav>

          {/* 역할 선택기 */}
          <UserSelector />
        </div>
      </div>
    </header>
  );
}

function NavLink({
  href,
  label,
  active,
}: {
  href: string;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
        active
          ? 'bg-blue-50 text-blue-700'
          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
      }`}
    >
      {label}
    </Link>
  );
}
