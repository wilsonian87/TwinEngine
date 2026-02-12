/**
 * Keyboard Hint Bar — Fixed bottom bar showing active shortcuts.
 *
 * Used in: Action Queue triage, Explorer navigation.
 * Configurable per module with different shortcut sets.
 */

import { motion, AnimatePresence } from "framer-motion";
import { MOTION_DURATION, MOTION_EASING } from "@/lib/motion-config";
import { cn } from "@/lib/utils";

export interface KeyboardHint {
  key: string;
  label: string;
  icon?: React.ReactNode;
}

interface KeyboardHintBarProps {
  hints: KeyboardHint[];
  visible?: boolean;
  className?: string;
}

export const ACTION_QUEUE_HINTS: KeyboardHint[] = [
  { key: "A", label: "Approve" },
  { key: "D", label: "Defer" },
  { key: "R", label: "Reject" },
  { key: "\u2191\u2193", label: "Navigate" },
  { key: "Space", label: "Expand" },
  { key: "Enter", label: "Profile" },
];

export const EXPLORER_HINTS: KeyboardHint[] = [
  { key: "\u2191\u2193", label: "Navigate" },
  { key: "Enter", label: "Open" },
  { key: "S", label: "Save to Audience" },
  { key: "/", label: "Search" },
];

export function KeyboardHintBar({ hints, visible = true, className }: KeyboardHintBarProps) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 40, opacity: 0 }}
          transition={{ duration: MOTION_DURATION.ui, ease: MOTION_EASING.out }}
          className={cn(
            "fixed bottom-0 left-0 right-0 z-40 flex items-center justify-center gap-4 border-t bg-background/95 backdrop-blur-sm px-4 py-2",
            className
          )}
        >
          {hints.map((hint) => (
            <div key={hint.key} className="flex items-center gap-1.5">
              <kbd className="inline-flex h-5 min-w-[20px] items-center justify-center rounded border bg-muted px-1.5 text-[10px] font-mono font-medium text-muted-foreground">
                {hint.key}
              </kbd>
              <span className="text-xs text-muted-foreground">{hint.label}</span>
            </div>
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
