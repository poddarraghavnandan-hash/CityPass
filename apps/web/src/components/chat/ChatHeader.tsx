import { motion } from 'framer-motion';

type ChatHeaderProps = {
  city?: string;
};

export function ChatHeader({ city }: ChatHeaderProps) {
  return (
    <motion.header
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur"
    >
      <div className="space-y-1">
        <p className="text-[13px] font-semibold text-white">CityLens</p>
        <p className="text-xs text-white/60">Tell me what kind of night you&apos;re in the mood for.</p>
      </div>
      {city && (
        <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs text-white/80">{city}</span>
      )}
    </motion.header>
  );
}
