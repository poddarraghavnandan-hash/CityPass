import type { RankedItem } from '@citypass/types';
import { StoryCard } from './StoryCard';

type StoryRowProps = {
  items: RankedItem[];
  onOpen: (item: RankedItem) => void;
};

export function StoryRow({ items, onOpen }: StoryRowProps) {
  return (
    <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
      {items.map((item) => (
        <StoryCard key={item.id} item={item} onOpen={onOpen} />
      ))}
    </div>
  );
}
