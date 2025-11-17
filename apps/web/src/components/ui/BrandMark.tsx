import { cn } from '@/lib/utils';

type BrandMarkProps = {
  className?: string;
  variant?: 'primary' | 'minimal';
};

export function BrandMark({ className, variant = 'primary' }: BrandMarkProps) {
  if (variant === 'minimal') {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        <span className="h-3 w-3 rounded-full bg-primary shadow-[0_0_30px_rgba(77,123,255,0.9)]" />
        <span className="text-sm uppercase tracking-[0.5em] text-white/60">CityLens</span>
      </div>
    );
  }

  return (
    <div className={cn('flex items-center gap-3', className)}>
      <div className="relative h-10 w-10 rounded-full border border-white/20 bg-gradient-to-br from-blue-600/40 via-transparent to-purple-600/40 shadow-[0_20px_60px_rgba(77,123,255,0.45)]">
        <div className="absolute inset-1 rounded-full border border-white/20 blur-[1px]" />
        <div className="absolute inset-3 rounded-full bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-500 opacity-60 blur-xl" />
      </div>
      <div>
        <span className="block text-xs uppercase tracking-[0.6em] text-white/60">CityPass</span>
        <p className="text-2xl font-semibold leading-none gradient-text">CityLens</p>
      </div>
    </div>
  );
}
