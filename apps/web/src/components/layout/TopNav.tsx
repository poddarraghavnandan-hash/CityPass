'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { BrandMark } from '@/components/ui/BrandMark';

const links = [
  { href: '/', label: 'Home' },
  { href: '/chat', label: 'Chat' },
  { href: '/feed', label: 'Feed' },
  { href: '/profile', label: 'Profile' },
  { href: '/onboarding', label: 'Onboarding' },
  { href: '/investors', label: 'Investors' },
];

export function TopNav() {
  const pathname = usePathname() || '/';
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-white/5 bg-black/60 backdrop-blur-2xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 md:px-8">
        <BrandMark />
        <nav className="hidden items-center gap-6 text-sm text-white/70 md:flex">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                'relative transition hover:text-white',
                pathname === link.href && 'text-white'
              )}
            >
              {link.label}
              {pathname === link.href && <span className="absolute -bottom-2 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white to-transparent" />}
            </Link>
          ))}
          <Button asChild className="rounded-full border border-white/30 bg-white text-black hover:bg-white/90 shadow-[0_8px_30px_rgba(77,123,255,0.35)]">
            <Link href="/chat">Launch Copilot</Link>
          </Button>
        </nav>
        <button
          type="button"
          className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 text-white md:hidden"
          onClick={() => setMenuOpen((prev) => !prev)}
          aria-label="Toggle navigation"
        >
          <span className="text-lg">{menuOpen ? '×' : '☰'}</span>
        </button>
      </div>
      {menuOpen && (
        <div className="border-t border-white/10 bg-black/80 px-4 py-4 text-sm text-white/70 md:hidden">
          <ul className="space-y-3">
            {links.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className={cn(
                    'block rounded-2xl px-4 py-2',
                    pathname === link.href ? 'bg-white/10 text-white' : 'hover:bg-white/5'
                  )}
                  onClick={() => setMenuOpen(false)}
                >
                  {link.label}
                </Link>
              </li>
            ))}
            <li>
              <Button
                asChild
                className="w-full rounded-full border border-white/20 bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-[0_5px_25px_rgba(77,123,255,0.55)]"
              >
                <Link href="/chat" onClick={() => setMenuOpen(false)}>
                  Launch Copilot
                </Link>
              </Button>
            </li>
          </ul>
        </div>
      )}
    </header>
  );
}
