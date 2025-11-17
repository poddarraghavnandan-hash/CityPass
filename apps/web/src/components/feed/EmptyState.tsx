import { EmptyState as BaseEmpty } from '@/components/common/EmptyState';

export function FeedEmptyState() {
  return <BaseEmpty title="We scanned the city" description="No events match this taste bubble yet. Shift the mood or expand the radius." />;
}
