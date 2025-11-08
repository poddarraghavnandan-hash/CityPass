'use client';

interface SocialProofBadgeProps {
  type: 'friends_saved' | 'trending' | 'popular' | 'viewing_now' | 'recently_saved';
  count?: number;
  variant?: 'subtle' | 'prominent';
  className?: string;
}

export function SocialProofBadge({
  type,
  count,
  variant = 'subtle',
  className = '',
}: SocialProofBadgeProps) {
  const getBadgeConfig = () => {
    switch (type) {
      case 'friends_saved':
        return {
          icon: '👥',
          text: count === 1 ? '1 friend saved' : `${count} friends saved`,
          bgColor: variant === 'prominent' ? 'bg-blue-100' : 'bg-blue-50',
          textColor: 'text-blue-700',
          borderColor: 'border-blue-200',
        };
      case 'trending':
        return {
          icon: '🔥',
          text: 'Trending',
          bgColor: variant === 'prominent' ? 'bg-orange-100' : 'bg-orange-50',
          textColor: 'text-orange-700',
          borderColor: 'border-orange-200',
        };
      case 'popular':
        return {
          icon: '⭐',
          text: count ? `${count.toLocaleString()} interested` : 'Popular',
          bgColor: variant === 'prominent' ? 'bg-purple-100' : 'bg-purple-50',
          textColor: 'text-purple-700',
          borderColor: 'border-purple-200',
        };
      case 'viewing_now':
        return {
          icon: '👀',
          text: count ? `${count.toLocaleString()} viewing now` : 'High interest',
          bgColor: variant === 'prominent' ? 'bg-green-100' : 'bg-green-50',
          textColor: 'text-green-700',
          borderColor: 'border-green-200',
        };
      case 'recently_saved':
        return {
          icon: '💾',
          text: count ? `${count} saved this week` : 'Recently saved',
          bgColor: variant === 'prominent' ? 'bg-indigo-100' : 'bg-indigo-50',
          textColor: 'text-indigo-700',
          borderColor: 'border-indigo-200',
        };
      default:
        return {
          icon: '✨',
          text: 'Popular',
          bgColor: 'bg-gray-100',
          textColor: 'text-gray-700',
          borderColor: 'border-gray-200',
        };
    }
  };

  const config = getBadgeConfig();

  return (
    <div
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${config.bgColor} ${config.textColor} ${config.borderColor} ${className}`}
    >
      <span className="leading-none">{config.icon}</span>
      <span>{config.text}</span>
    </div>
  );
}

interface SocialProofGroupProps {
  friendSaveCount?: number;
  saveCount24h?: number;
  viewCount24h?: number;
  isTrending?: boolean;
  className?: string;
}

export function SocialProofGroup({
  friendSaveCount = 0,
  saveCount24h = 0,
  viewCount24h = 0,
  isTrending = false,
  className = '',
}: SocialProofGroupProps) {
  const badges: React.ReactNode[] = [];

  // Priority order: friends saved > trending > viewing now > popular
  if (friendSaveCount > 0) {
    badges.push(
      <SocialProofBadge
        key="friends"
        type="friends_saved"
        count={friendSaveCount}
        variant="prominent"
      />
    );
  }

  if (isTrending) {
    badges.push(
      <SocialProofBadge
        key="trending"
        type="trending"
        variant="prominent"
      />
    );
  }

  if (viewCount24h > 50) {
    badges.push(
      <SocialProofBadge
        key="viewing"
        type="viewing_now"
        count={viewCount24h}
        variant="subtle"
      />
    );
  }

  if (saveCount24h > 10 && !friendSaveCount) {
    badges.push(
      <SocialProofBadge
        key="saves"
        type="recently_saved"
        count={saveCount24h}
        variant="subtle"
      />
    );
  }

  if (badges.length === 0) return null;

  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {badges}
    </div>
  );
}
