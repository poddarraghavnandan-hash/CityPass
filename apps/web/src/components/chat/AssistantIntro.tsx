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
        <p className="text-lg font-semibold text-white">What kind of night are you in the mood for?</p>
        <p className="text-sm text-white/60">Drop a vibe, a time, a neighborhood—or just how you want to feel.</p>
      </div>
    </motion.div>
  );
}
