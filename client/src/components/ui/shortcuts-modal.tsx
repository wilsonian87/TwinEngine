/**
 * Keyboard Shortcuts Modal
 *
 * Help modal showing all available keyboard shortcuts.
 * Triggered globally with the ? key.
 *
 * @see ROADMAP-PHASE9-INTERACTION-EXPERIENCE.md M9G.1, M9H.2
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Keyboard } from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================================================
// TYPES
// ============================================================================

interface ShortcutGroup {
  title: string;
  shortcuts: Shortcut[];
}

interface Shortcut {
  keys: string[];
  description: string;
}

// ============================================================================
// SHORTCUTS CONFIG
// ============================================================================

const SHORTCUT_GROUPS: ShortcutGroup[] = [
  {
    title: 'Navigation',
    shortcuts: [
      { keys: ['⌘', 'K'], description: 'Open command palette' },
      { keys: ['/'], description: 'Open command palette' },
      { keys: ['?'], description: 'Show keyboard shortcuts' },
      { keys: ['Esc'], description: 'Close modal or palette' },
    ],
  },
  {
    title: 'List Navigation',
    shortcuts: [
      { keys: ['J'], description: 'Move down in list' },
      { keys: ['K'], description: 'Move up in list' },
      { keys: ['↓'], description: 'Move down in list' },
      { keys: ['↑'], description: 'Move up in list' },
      { keys: ['Enter'], description: 'Select item' },
      { keys: ['Home'], description: 'Go to first item' },
      { keys: ['End'], description: 'Go to last item' },
    ],
  },
  {
    title: 'Item Actions',
    shortcuts: [
      { keys: ['E'], description: 'Edit selected item' },
      { keys: ['V'], description: 'View selected item' },
      { keys: ['D'], description: 'Delete selected item' },
    ],
  },
];

// ============================================================================
// KEY BADGE
// ============================================================================

interface KeyBadgeProps {
  keyName: string;
  className?: string;
}

function KeyBadge({ keyName, className }: KeyBadgeProps) {
  const isModifier = ['⌘', 'Ctrl', 'Alt', 'Shift'].includes(keyName);
  const isArrow = ['↓', '↑', '←', '→'].includes(keyName);

  return (
    <kbd
      className={cn(
        'inline-flex items-center justify-center',
        'min-w-[28px] h-7 px-2 rounded-md',
        'bg-border-gray/50 border border-border-gray',
        'text-sm font-mono text-signal-white',
        isModifier && 'text-xs',
        isArrow && 'text-base',
        className
      )}
    >
      {keyName}
    </kbd>
  );
}

// ============================================================================
// SHORTCUT ROW
// ============================================================================

interface ShortcutRowProps {
  shortcut: Shortcut;
}

function ShortcutRow({ shortcut }: ShortcutRowProps) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-data-gray text-sm">{shortcut.description}</span>
      <div className="flex items-center gap-1">
        {shortcut.keys.map((key, index) => (
          <React.Fragment key={key}>
            <KeyBadge keyName={key} />
            {index < shortcut.keys.length - 1 && (
              <span className="text-muted-gray text-xs">+</span>
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// SHORTCUTS MODAL
// ============================================================================

interface ShortcutsModalProps {
  open: boolean;
  onClose: () => void;
}

export function ShortcutsModal({ open, onClose }: ShortcutsModalProps) {
  // Close on Escape
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) {
        e.preventDefault();
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-void-black/80 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2"
          >
            <div className="w-[500px] max-w-[90vw] max-h-[80vh] overflow-auto rounded-xl bg-void-black/95 border border-border-gray shadow-2xl backdrop-blur-sm">
              {/* Header */}
              <div className="flex items-center justify-between p-5 border-b border-border-gray">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-consumption-purple/10">
                    <Keyboard className="w-5 h-5 text-consumption-purple" />
                  </div>
                  <h2 className="text-lg font-semibold text-signal-white">
                    Keyboard Shortcuts
                  </h2>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 rounded-lg text-muted-gray hover:text-signal-white hover:bg-border-gray/50 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Content */}
              <div className="p-5 space-y-6">
                {SHORTCUT_GROUPS.map((group) => (
                  <div key={group.title}>
                    <h3 className="text-xs font-semibold text-muted-gray uppercase tracking-wider mb-3">
                      {group.title}
                    </h3>
                    <div className="divide-y divide-border-gray/50">
                      {group.shortcuts.map((shortcut) => (
                        <ShortcutRow
                          key={shortcut.description}
                          shortcut={shortcut}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Footer */}
              <div className="px-5 py-4 border-t border-border-gray bg-border-gray/10">
                <p className="text-xs text-muted-gray text-center">
                  Press <KeyBadge keyName="?" className="mx-1 h-5 min-w-[20px] px-1 text-xs" /> anywhere to show this help
                </p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ============================================================================
// EXPORTS
// ============================================================================

export default ShortcutsModal;
export { SHORTCUT_GROUPS };
export type { ShortcutGroup, Shortcut };
