/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { AlertTriangle, RefreshCw, X } from 'lucide-react';

interface ErrorBannerProps {
  message: string | null;
  onRetry?: () => void;
  onDismiss: () => void;
  isRetrying?: boolean;
}

export const ErrorBanner: React.FC<ErrorBannerProps> = ({
  message,
  onRetry,
  onDismiss,
  isRetrying = false,
}) => {
  if (!message) return null;

  return (
    <div
      id="app-error-banner"
      role="alert"
      className="bg-amber-950/40 border border-amber-500/30 text-amber-200 px-4 py-3 rounded-xl flex items-center justify-between gap-3 shadow-sm mb-4"
    >
      <div className="flex items-center gap-2.5">
        <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
        <span className="text-sm font-medium">{message}</span>
      </div>
      <div className="flex items-center gap-2">
        {onRetry && (
          <button
            id="error-retry-button"
            type="button"
            onClick={onRetry}
            disabled={isRetrying}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-200 transition-colors disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRetrying ? 'animate-spin' : ''}`} />
            <span>{isRetrying ? 'Retrying...' : 'Retry'}</span>
          </button>
        )}
        <button
          id="error-dismiss-button"
          type="button"
          onClick={onDismiss}
          className="p-1 rounded-lg text-amber-400 hover:text-amber-200 hover:bg-amber-900/40 transition-colors cursor-pointer"
          aria-label="Dismiss error"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
