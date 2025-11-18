'use client';

import { motion } from 'framer-motion';

export function SkeletonStoryCard() {
  return (
    <motion.div
      className="relative min-w-[240px] max-w-[260px] overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-white/5 via-transparent to-black/20 p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <motion.div
        className="absolute inset-0 -z-10 bg-[linear-gradient(110deg,rgba(255,255,255,0.05),rgba(255,255,255,0.25),rgba(255,255,255,0.05))]"
        animate={{ backgroundPosition: ['0% 0%', '200% 0%', '0% 0%'] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
        style={{ backgroundSize: '200% 100%' }}
      />
      <div className="mb-4 aspect-[3/4] w-full rounded-2xl bg-white/10" />
      <div className="space-y-3">
        <div className="h-3 w-1/2 rounded-full bg-white/10" />
        <div className="h-4 w-3/4 rounded-full bg-white/15" />
        <div className="h-3 w-2/3 rounded-full bg-white/10" />
      </div>
    </motion.div>
  );
}
