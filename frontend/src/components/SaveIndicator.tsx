/**
 * Save Indicator Component
 *
 * Shows visual feedback when fields are auto-saved
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Loader2, AlertCircle } from 'lucide-react';

interface SaveIndicatorProps {
  saving?: boolean;
  saved?: boolean;
  error?: string | null;
  className?: string;
}

export function SaveIndicator({ saving, saved, error, className = '' }: SaveIndicatorProps) {
  // Don't show anything if nothing is happening
  if (!saving && !saved && !error) {
    return null;
  }

  return (
    <AnimatePresence mode="wait">
      {saving && (
        <motion.div
          key="saving"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          className={`inline-flex items-center gap-1.5 text-sm text-gray-600 ${className}`}
        >
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          <span>Saving...</span>
        </motion.div>
      )}

      {saved && (
        <motion.div
          key="saved"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          className={`inline-flex items-center gap-1.5 text-sm text-green-600 ${className}`}
        >
          <Check className="w-3.5 h-3.5" />
          <span>Saved</span>
        </motion.div>
      )}

      {error && (
        <motion.div
          key="error"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          className={`inline-flex items-center gap-1.5 text-sm text-red-600 ${className}`}
        >
          <AlertCircle className="w-3.5 h-3.5" />
          <span>Save failed</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * Inline Save Indicator (for use inside input fields)
 */
export function InlineSaveIndicator({ saving, saved, error }: SaveIndicatorProps) {
  if (!saving && !saved && !error) {
    return null;
  }

  return (
    <div className="absolute right-3 top-1/2 -translate-y-1/2">
      {saving && (
        <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
      )}
      {saved && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="text-green-600"
        >
          <Check className="w-4 h-4" />
        </motion.div>
      )}
      {error && (
        <AlertCircle className="w-4 h-4 text-red-600" />
      )}
    </div>
  );
}

/**
 * Global Save Status Banner (for form header)
 */
export function GlobalSaveStatus({ lastSaved }: { lastSaved: Date | null }) {
  if (!lastSaved) return null;

  const timeAgo = getTimeAgo(lastSaved);

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-green-50 border border-green-200 rounded-lg px-4 py-2 flex items-center gap-2"
    >
      <Check className="w-4 h-4 text-green-600" />
      <span className="text-sm text-green-800">
        Progress saved {timeAgo}
      </span>
    </motion.div>
  );
}

function getTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

  if (seconds < 10) return 'just now';
  if (seconds < 60) return `${seconds} seconds ago`;

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;

  const hours = Math.floor(minutes / 60);
  return `${hours} hour${hours > 1 ? 's' : ''} ago`;
}
