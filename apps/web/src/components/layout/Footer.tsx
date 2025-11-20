import Link from 'next/link';

const footerLinks = [
  { label: 'Press kit', href: '/investors' },
  { label: 'Contact', href: 'mailto:hello@citypass.ai' },
  { label: 'Docs', href: 'https://docs.citypass.ai' },
];

export function Footer() {
  return (
    <footer className="border-t border-white/5 bg-[rgba(5,5,9,0.8)]">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-3 px-4 py-6 text-xs text-white/60 md:flex-row md:items-center md:justify-between">
        <p>© {new Date().getFullYear()} CityLens. Built for people who explore.</p>
        <div className="flex flex-wrap gap-4">
          {footerLinks.map((item) => (
            <Link key={item.label} href={item.href} className="transition hover:text-white" prefetch={false}>
              {item.label}
            </Link>
          ))}
        </div>
      </div>
    </footer>
  );
}
