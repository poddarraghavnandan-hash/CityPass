'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

type NeonOrbProps = {
  className?: string;
};

export function NeonOrb({ className }: NeonOrbProps) {
  return (
    <div className={cn('relative h-14 w-14', className)}>
      <motion.div
        className="absolute inset-0 rounded-full bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 opacity-70 blur-xl"
        animate={{ scale: [1, 1.08, 1] }}
        transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
      />
      <div className="absolute inset-2 rounded-full border border-white/20 bg-black/60 shadow-[0_0_30px_rgba(77,123,255,0.5)]" />
      <div className="absolute inset-4 rounded-full bg-gradient-to-br from-blue-500/60 to-purple-600/60" />
    </div>
  );
}
