import type { RankedItem } from '@citypass/types';
import { StoryCard } from './StoryCard';

type StoryRowProps = {
  items: RankedItem[];
  onOpen: (item: RankedItem) => void;
  traceId?: string;
  slateLabel?: string;
};

export function StoryRow({ items, onOpen, traceId, slateLabel }: StoryRowProps) {
  return (
    <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
      {items.map((item, index) => (
        <StoryCard key={item.id} item={item} onOpen={onOpen} traceId={traceId} slateLabel={slateLabel} index={index} />
      ))}
    </div>
  );
}
