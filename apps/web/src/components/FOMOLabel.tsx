'use client';

import { useState, useEffect } from 'react';

interface FOMOLabelProps {
  type: 'limited_tickets' | 'selling_fast' | 'countdown' | 'last_chance';
  ticketsRemaining?: number;
  eventDate?: Date | string;
  variant?: 'pill' | 'banner';
  className?: string;
}

export function FOMOLabel({
  type,
  ticketsRemaining,
  eventDate,
  variant = 'pill',
  className = '',
}: FOMOLabelProps) {
  const [timeLeft, setTimeLeft] = useState<string>('');

  useEffect(() => {
    if (type === 'countdown' && eventDate) {
      const updateCountdown = () => {
        const now = new Date().getTime();
        const eventTime = new Date(eventDate).getTime();
        const distance = eventTime - now;

        if (distance < 0) {
          setTimeLeft('Event started');
          return;
        }

        const hours = Math.floor(distance / (1000 * 60 * 60));
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));

        if (hours < 48) {
          setTimeLeft(`${hours}h ${minutes}m`);
        } else {
          const days = Math.floor(hours / 24);
          setTimeLeft(`${days} days`);
        }
      };

      updateCountdown();
      const interval = setInterval(updateCountdown, 60000); // Update every minute

      return () => clearInterval(interval);
    }
  }, [type, eventDate]);

  const getConfig = () => {
    switch (type) {
      case 'limited_tickets':
        return {
          icon: '🎟️',
          text: ticketsRemaining
            ? `Only ${ticketsRemaining} tickets left`
            : 'Limited tickets',
          bgColor: 'bg-red-100',
          textColor: 'text-red-700',
          borderColor: 'border-red-200',
          pulse: ticketsRemaining && ticketsRemaining <= 5,
        };
      case 'selling_fast':
        return {
          icon: '🔥',
          text: 'Selling fast',
          bgColor: 'bg-orange-100',
          textColor: 'text-orange-700',
          borderColor: 'border-orange-200',
          pulse: true,
        };
      case 'countdown':
        return {
          icon: '⏰',
          text: timeLeft ? `Starts in ${timeLeft}` : 'Starting soon',
          bgColor: 'bg-yellow-100',
          textColor: 'text-yellow-800',
          borderColor: 'border-yellow-200',
          pulse: false,
        };
      case 'last_chance':
        return {
          icon: '⚡',
          text: 'Last chance',
          bgColor: 'bg-red-100',
          textColor: 'text-red-700',
          borderColor: 'border-red-200',
          pulse: true,
        };
      default:
        return {
          icon: '⚡',
          text: 'Act fast',
          bgColor: 'bg-gray-100',
          textColor: 'text-gray-700',
          borderColor: 'border-gray-200',
          pulse: false,
        };
    }
  };

  const config = getConfig();

  if (variant === 'banner') {
    return (
      <div
        className={`flex items-center justify-center gap-2 ${config.bgColor} ${config.textColor} px-4 py-2 text-sm font-semibold ${className}`}
      >
        <span className={config.pulse ? 'animate-pulse' : ''}>{config.icon}</span>
        <span>{config.text}</span>
      </div>
    );
  }

  return (
    <div
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold ${config.bgColor} ${config.textColor} ${config.borderColor} ${className} ${
        config.pulse ? 'animate-pulse' : ''
      }`}
    >
      <span className="leading-none">{config.icon}</span>
      <span>{config.text}</span>
    </div>
  );
}

interface EventUrgencyIndicatorProps {
  eventDate: Date | string;
  ticketsRemaining?: number | null;
  recentSaveCount?: number;
  className?: string;
}

export function EventUrgencyIndicator({
  eventDate,
  ticketsRemaining,
  recentSaveCount = 0,
  className = '',
}: EventUrgencyIndicatorProps) {
  const getUrgency = () => {
    const now = new Date();
    const event = new Date(eventDate);
    const hoursUntilEvent = (event.getTime() - now.getTime()) / (1000 * 60 * 60);

    // Last chance (< 3 hours)
    if (hoursUntilEvent < 3 && hoursUntilEvent > 0) {
      return <FOMOLabel type="last_chance" />;
    }

    // Limited tickets (critical)
    if (ticketsRemaining && ticketsRemaining <= 10) {
      return <FOMOLabel type="limited_tickets" ticketsRemaining={ticketsRemaining} />;
    }

    // Countdown for events within 48 hours
    if (hoursUntilEvent < 48 && hoursUntilEvent > 3) {
      return <FOMOLabel type="countdown" eventDate={eventDate} />;
    }

    // Selling fast (high recent saves)
    if (recentSaveCount > 50) {
      return <FOMOLabel type="selling_fast" />;
    }

    // Limited tickets (warning)
    if (ticketsRemaining && ticketsRemaining <= 50) {
      return <FOMOLabel type="limited_tickets" ticketsRemaining={ticketsRemaining} />;
    }

    return null;
  };

  const urgencyLabel = getUrgency();

  if (!urgencyLabel) return null;

  return <div className={className}>{urgencyLabel}</div>;
}
