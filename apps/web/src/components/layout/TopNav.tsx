'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

const links = [
  { href: '/chat', label: 'Chat' },
  { href: '/feed', label: 'Feed' },
  { href: '/profile', label: 'Profile' },
  { href: '/investors', label: 'Investors' },
];

export function TopNav() {
  const pathname = usePathname() || '/';
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-white/5 bg-[rgba(5,5,9,0.75)] backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-3">
        <Link href="/chat" className="text-lg font-semibold tracking-tight text-white">
          CityLens
        </Link>
        <nav className="hidden items-center gap-6 text-sm text-white/70 md:flex">
          {links.map((link) => {
            const active = pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  'relative pb-1 transition-colors hover:text-white',
                  active && 'text-white'
                )}
              >
                {link.label}
                {active && <span className="absolute bottom-0 left-0 right-0 mx-auto h-0.5 w-6 rounded-full bg-teal-300" />}
              </Link>
            );
          })}
          <Button
            asChild
            className="rounded-full bg-gradient-to-r from-teal-400 to-sky-500 px-4 py-2 text-sm font-semibold text-black shadow-[0_10px_30px_rgba(45,212,191,0.35)] hover:opacity-90"
          >
            <Link href="/chat">Open chat</Link>
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
        <div className="border-t border-white/10 bg-[#050509]/95 px-4 py-4 text-sm text-white/80 md:hidden">
          <ul className="space-y-3">
            {links.map((link) => {
              const active = pathname.startsWith(link.href);
              return (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className={cn(
                      'block rounded-2xl px-4 py-2',
                      active ? 'bg-white/10 text-white' : 'hover:bg-white/5'
                    )}
                    onClick={() => setMenuOpen(false)}
                  >
                    {link.label}
                  </Link>
                </li>
              );
            })}
            <li>
              <Button
                asChild
                className="w-full rounded-full bg-gradient-to-r from-teal-400 to-sky-500 text-black"
              >
                <Link href="/chat" onClick={() => setMenuOpen(false)}>
                  Open chat
                </Link>
              </Button>
            </li>
          </ul>
        </div>
      )}
    </header>
  );
}
