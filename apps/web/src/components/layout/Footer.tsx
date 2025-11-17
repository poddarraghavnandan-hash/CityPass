import Link from 'next/link';

const footerLinks = [
  { label: 'Press kit', href: '/investors' },
  { label: 'Contact', href: 'mailto:hello@citypass.ai' },
  { label: 'Docs', href: 'https://docs.citypass.ai' },
];

export function Footer() {
  return (
    <footer className="border-t border-white/5 bg-black/60">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-8 text-sm text-white/60 md:flex-row md:items-center md:justify-between">
        <p>© {new Date().getFullYear()} CityLens. Built for the seekers.</p>
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
