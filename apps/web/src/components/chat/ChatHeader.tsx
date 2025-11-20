'use client';

import { motion } from 'framer-motion';
import { Chip } from '@/components/ui/Chip';

type ChatHeaderProps = {
  city?: string;
};

export function ChatHeader({ city }: ChatHeaderProps) {
  return (
    <motion.header
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="rounded-[28px] border border-white/10 bg-gradient-to-br from-white/5 via-transparent to-transparent px-5 py-5 backdrop-blur"
    >
      <div className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-white/50">
        <Chip asChild variant="soft" size="sm">
          <span className="text-[11px] tracking-tight text-white/80">{city || 'Your city'}</span>
        </Chip>
        Concierge
      </div>
      <div className="mt-3 space-y-2">
        <h1 className="text-2xl font-semibold text-white">CityLens</h1>
        <p className="text-sm text-white/70">
          Tell me what you feel like doing—morning workouts, quiet cafés, museums, twilight walks, late dinners—and I&apos;ll surface real plans nearby.
        </p>
      </div>
    </motion.header>
  );
}
