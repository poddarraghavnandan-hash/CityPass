'use client';

import { motion } from 'framer-motion';

export function SkeletonStoryCard() {
  return (
    <motion.div
      className="overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.03] shadow-[0_25px_70px_rgba(5,5,12,0.55)]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className="h-48 w-full animate-pulse bg-gradient-to-br from-white/5 via-white/10 to-transparent" />
      <div className="space-y-3 px-4 pb-4 pt-5">
        <div className="h-3 w-1/3 rounded-full bg-white/10" />
        <div className="h-4 w-2/3 rounded-full bg-white/15" />
        <div className="h-3 w-3/4 rounded-full bg-white/10" />
        <div className="flex gap-2">
          <div className="h-6 w-16 rounded-full bg-white/10" />
          <div className="h-6 w-16 rounded-full bg-white/5" />
          <div className="h-6 w-16 rounded-full bg-white/5" />
        </div>
        <div className="h-10 w-full rounded-2xl bg-white/10" />
      </div>
    </motion.div>
  );
}
