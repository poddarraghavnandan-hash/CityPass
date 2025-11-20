import { NeonOrb } from '@/components/ui/NeonOrb';
import { motion } from 'framer-motion';

export function AssistantIntro() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className="flex items-center gap-4 rounded-[28px] border border-white/10 bg-white/5 p-4 backdrop-blur"
    >
      <NeonOrb />
      <div>
        <p className="text-lg font-semibold text-white">Hey! I'm your CityLens concierge.</p>
        <p className="text-sm text-white/70">Tell me what you're looking for—I understand budgets, vibes, timing, who you're with, and even things you want to avoid.</p>
        <p className="mt-1 text-xs text-white/50">Try: "Free events tonight", "Date night under $50", "Solo-friendly without crowds"</p>
      </div>
    </motion.div>
  );
}
