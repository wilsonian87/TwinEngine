/**
 * NotificationCenter Component
 *
 * In-app notification center for persistent notifications,
 * alerts, and system messages. Accessible via header icon.
 *
 * @see ROADMAP-PHASE9-INTERACTION-EXPERIENCE.md M9F
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell,
  CheckCircle,
  AlertCircle,
  Info,
  AlertTriangle,
  X,
  Check,
  Trash2,
  Settings,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

// ============================================================================
// TYPES
// ============================================================================

export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  timestamp: Date;
  read: boolean;
  actionLabel?: string;
  onAction?: () => void;
  dismissible?: boolean;
}

interface NotificationCenterProps {
  notifications: Notification[];
  onMarkAsRead?: (id: string) => void;
  onMarkAllAsRead?: () => void;
  onDismiss?: (id: string) => void;
  onClearAll?: () => void;
  onSettingsClick?: () => void;
  className?: string;
}

// ============================================================================
// CONFIG
// ============================================================================

const typeConfig = {
  success: {
    icon: CheckCircle,
    iconColor: 'text-emerald-400',
    borderColor: 'border-l-emerald-400',
    bgColor: 'bg-emerald-400/5',
  },
  error: {
    icon: AlertCircle,
    iconColor: 'text-red-400',
    borderColor: 'border-l-red-400',
    bgColor: 'bg-red-400/5',
  },
  warning: {
    icon: AlertTriangle,
    iconColor: 'text-amber-400',
    borderColor: 'border-l-amber-400',
    bgColor: 'bg-amber-400/5',
  },
  info: {
    icon: Info,
    iconColor: 'text-consumption-purple',
    borderColor: 'border-l-consumption-purple',
    bgColor: 'bg-consumption-purple/5',
  },
};

// ============================================================================
// HELPERS
// ============================================================================

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

// ============================================================================
// NOTIFICATION ITEM
// ============================================================================

interface NotificationItemProps {
  notification: Notification;
  onMarkAsRead?: () => void;
  onDismiss?: () => void;
}

function NotificationItem({ notification, onMarkAsRead, onDismiss }: NotificationItemProps) {
  const config = typeConfig[notification.type];
  const Icon = config.icon;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className={cn(
        'relative p-3 border-l-2 rounded-r-lg',
        config.borderColor,
        !notification.read && config.bgColor,
        notification.read && 'opacity-60'
      )}
    >
      <div className="flex gap-3">
        {/* Icon */}
        <div className="shrink-0 pt-0.5">
          <Icon className={cn('w-4 h-4', config.iconColor)} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h4
              className={cn(
                'text-sm',
                notification.read ? 'text-data-gray' : 'text-signal-white font-medium'
              )}
            >
              {notification.title}
            </h4>
            <span className="text-[10px] text-muted-gray shrink-0">
              {formatRelativeTime(notification.timestamp)}
            </span>
          </div>

          {notification.message && (
            <p className="text-xs text-muted-gray mt-0.5 line-clamp-2">
              {notification.message}
            </p>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2 mt-2">
            {notification.actionLabel && notification.onAction && (
              <button
                onClick={notification.onAction}
                className="text-xs text-consumption-purple hover:underline"
              >
                {notification.actionLabel}
              </button>
            )}
            {!notification.read && onMarkAsRead && (
              <button
                onClick={onMarkAsRead}
                className="flex items-center gap-1 text-[10px] text-muted-gray hover:text-signal-white"
              >
                <Check className="w-3 h-3" />
                Mark read
              </button>
            )}
          </div>
        </div>

        {/* Dismiss */}
        {notification.dismissible !== false && onDismiss && (
          <button
            onClick={onDismiss}
            className="shrink-0 p-1 text-muted-gray hover:text-signal-white transition-colors"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Unread indicator */}
      {!notification.read && (
        <div className="absolute top-3 right-3 w-2 h-2 rounded-full bg-consumption-purple" />
      )}
    </motion.div>
  );
}

// ============================================================================
// NOTIFICATION CENTER
// ============================================================================

/**
 * NotificationCenter with popover trigger.
 *
 * @example
 * <NotificationCenter
 *   notifications={notifications}
 *   onMarkAsRead={(id) => markAsRead(id)}
 *   onDismiss={(id) => dismiss(id)}
 *   onClearAll={() => clearAll()}
 * />
 */
export function NotificationCenter({
  notifications,
  onMarkAsRead,
  onMarkAllAsRead,
  onDismiss,
  onClearAll,
  onSettingsClick,
  className,
}: NotificationCenterProps) {
  const [open, setOpen] = useState(false);
  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn('relative', className)}
        >
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[18px] h-[18px] rounded-full bg-consumption-purple text-[10px] font-semibold text-signal-white px-1">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[380px] p-0 bg-void-black/95 border-border-gray backdrop-blur-sm"
        align="end"
        sideOffset={8}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border-gray">
          <h3 className="text-sm font-semibold text-signal-white">Notifications</h3>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && onMarkAllAsRead && (
              <button
                onClick={onMarkAllAsRead}
                className="text-xs text-consumption-purple hover:underline"
              >
                Mark all read
              </button>
            )}
            {onSettingsClick && (
              <button
                onClick={onSettingsClick}
                className="p-1 text-muted-gray hover:text-signal-white"
              >
                <Settings className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Notifications List */}
        <div className="max-h-[400px] overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="py-12 text-center">
              <Bell className="w-8 h-8 text-muted-gray mx-auto mb-2 opacity-50" />
              <p className="text-sm text-muted-gray">No notifications</p>
            </div>
          ) : (
            <AnimatePresence mode="popLayout">
              <div className="p-2 space-y-1">
                {notifications.map((notification) => (
                  <NotificationItem
                    key={notification.id}
                    notification={notification}
                    onMarkAsRead={onMarkAsRead ? () => onMarkAsRead(notification.id) : undefined}
                    onDismiss={onDismiss ? () => onDismiss(notification.id) : undefined}
                  />
                ))}
              </div>
            </AnimatePresence>
          )}
        </div>

        {/* Footer */}
        {notifications.length > 0 && onClearAll && (
          <div className="p-3 border-t border-border-gray">
            <button
              onClick={onClearAll}
              className="flex items-center gap-2 text-xs text-muted-gray hover:text-signal-white w-full justify-center"
            >
              <Trash2 className="w-3 h-3" />
              Clear all notifications
            </button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

// ============================================================================
// NOTIFICATION BADGE
// ============================================================================

interface NotificationBadgeProps {
  count: number;
  className?: string;
}

/**
 * Standalone notification badge.
 */
export function NotificationBadge({ count, className }: NotificationBadgeProps) {
  if (count === 0) return null;

  return (
    <span
      className={cn(
        'inline-flex items-center justify-center min-w-[18px] h-[18px] rounded-full',
        'bg-consumption-purple text-[10px] font-semibold text-signal-white px-1',
        className
      )}
    >
      {count > 99 ? '99+' : count}
    </span>
  );
}

// ============================================================================
// EXPORTS
// ============================================================================

export default NotificationCenter;
