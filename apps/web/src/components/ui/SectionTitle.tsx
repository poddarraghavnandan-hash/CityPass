import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type SectionTitleProps = {
  title: string;
  eyebrow?: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
};

export function SectionTitle({ title, eyebrow, description, actions, className }: SectionTitleProps) {
  return (
    <div className={cn('flex flex-col gap-3 md:flex-row md:items-end md:justify-between', className)}>
      <div>
        {eyebrow && <p className="text-xs uppercase tracking-[0.6em] text-white/50">{eyebrow}</p>}
        <h2 className="text-3xl font-semibold text-white">{title}</h2>
        {description && <p className="max-w-2xl text-sm text-white/70">{description}</p>}
      </div>
      {actions}
    </div>
  );
}
