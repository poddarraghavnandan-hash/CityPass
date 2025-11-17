import { motion } from 'framer-motion';
import { LucideIcon, Search, Calendar, Heart, MapPin, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  darkMode?: boolean;
  className?: string;
}

export function EmptyState({
  icon: Icon = Sparkles,
  title,
  description,
  action,
  secondaryAction,
  darkMode = false,
  className,
}: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn('flex flex-col items-center justify-center py-16 px-4 text-center', className)}
    >
      {/* Icon */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 200, delay: 0.1 }}
        className={cn(
          'w-20 h-20 rounded-full flex items-center justify-center mb-6',
          darkMode ? 'bg-white/10' : 'bg-gray-100'
        )}
      >
        <Icon className={cn('w-10 h-10', darkMode ? 'text-purple-400' : 'text-purple-600')} />
      </motion.div>

      {/* Title */}
      <h3 className={cn('text-2xl font-bold mb-3', darkMode ? 'text-white' : 'text-gray-900')}>
        {title}
      </h3>

      {/* Description */}
      {description && (
        <p className={cn('text-base max-w-md mb-8', darkMode ? 'text-gray-400' : 'text-gray-600')}>
          {description}
        </p>
      )}

      {/* Actions */}
      {(action || secondaryAction) && (
        <div className="flex flex-col sm:flex-row gap-4">
          {action && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={action.onClick}
              className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-full font-medium shadow-lg hover:shadow-xl transition"
            >
              {action.label}
            </motion.button>
          )}

          {secondaryAction && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={secondaryAction.onClick}
              className={cn(
                'px-6 py-3 rounded-full font-medium transition border-2',
                darkMode
                  ? 'bg-white/10 text-white border-white/20 hover:bg-white/20'
                  : 'bg-white text-gray-900 border-gray-300 hover:bg-gray-50'
              )}
            >
              {secondaryAction.label}
            </motion.button>
          )}
        </div>
      )}
    </motion.div>
  );
}

/**
 * Pre-built empty state variants for common scenarios
 */

export function NoSearchResults({ onClear, darkMode }: { onClear: () => void; darkMode?: boolean }) {
  return (
    <EmptyState
      icon={Search}
      title="No Results Found"
      description="We couldn't find any events matching your search. Try adjusting your filters or search terms."
      action={{
        label: 'Clear Filters',
        onClick: onClear,
      }}
      darkMode={darkMode}
    />
  );
}

export function NoEventsScheduled({ onBrowse, darkMode }: { onBrowse: () => void; darkMode?: boolean }) {
  return (
    <EmptyState
      icon={Calendar}
      title="No Events Scheduled"
      description="You haven't saved any events yet. Start exploring to find your next adventure!"
      action={{
        label: 'Browse Events',
        onClick: onBrowse,
      }}
      darkMode={darkMode}
    />
  );
}

export function NoFavorites({ onDiscover, darkMode }: { onDiscover: () => void; darkMode?: boolean }) {
  return (
    <EmptyState
      icon={Heart}
      title="No Favorites Yet"
      description="Save events you're interested in to easily find them later."
      action={{
        label: 'Discover Events',
        onClick: onDiscover,
      }}
      darkMode={darkMode}
    />
  );
}

export function NoNearbyEvents({ onChangeLocation, darkMode }: { onChangeLocation: () => void; darkMode?: boolean }) {
  return (
    <EmptyState
      icon={MapPin}
      title="No Nearby Events"
      description="We couldn't find any events in your area. Try expanding your search radius or checking another location."
      action={{
        label: 'Change Location',
        onClick: onChangeLocation,
      }}
      darkMode={darkMode}
    />
  );
}

export function FeedEmpty({ onRefresh, darkMode }: { onRefresh: () => void; darkMode?: boolean }) {
  return (
    <EmptyState
      icon={Sparkles}
      title="Your Feed is Empty"
      description="We're still learning your preferences. Browse some events to help us personalize your feed!"
      action={{
        label: 'Refresh Feed',
        onClick: onRefresh,
      }}
      darkMode={darkMode}
    />
  );
}
