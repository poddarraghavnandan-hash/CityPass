import { GlowPill } from '@/components/ui/GlowPill';
import { motion } from 'framer-motion';

const EXAMPLES = [
  'Something strenuous near Midtown at 6pm',
  'Fun workout close to Hudson Yards',
  'Eclectic music in Brooklyn',
  'Impress someone who likes to party',
  'Analog synths after 9pm',
];

type ExampleQueriesProps = {
  onSelect: (query: string) => void;
};

export function ExampleQueries({ onSelect }: ExampleQueriesProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="flex gap-2 overflow-x-auto pb-2"
    >
      {EXAMPLES.map((q) => (
        <GlowPill key={q} onClick={() => onSelect(q)} className="whitespace-nowrap">
          {q}
        </GlowPill>
      ))}
    </motion.div>
  );
}
