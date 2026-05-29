 "use client";

  import { useState } from "react";

  type DeliveryPreviewProps = {
    url?: string;
    error?: boolean;
  };

  export function DeliveryPreview({ url, error = false }: DeliveryPreviewProps) {
    const [loadFailed, setLoadFailed] = useState(false);

    if (!url) {
      return (
        <div className="flex h-64 items-center justify-center rounded-lg border border-border bg-surface text-sm text-text-muted">
          No delivery yet.
        </div>
      );
    }

    const showError = error || loadFailed;

    return (
      <div className="overflow-hidden rounded-lg border border-border bg-surface">
        <div className="flex items-center justify-between gap-3 border-b border-border px-3 py-2">
          <span className="truncate font-mono text-xs text-text-secondary">{url}</span>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 text-xs text-accent-light hover:underline"
          >
            Open in new tab ↗
          </a>
        </div>

        {showError ? (
          <div className="flex h-64 flex-col items-center justify-center gap-3 px-6 text-center">
            <p className="text-sm text-text-secondary">Couldn&apos;t load preview.</p>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-accent hover:underline"
            >
              Open in new tab ↗
            </a>
          </div>
        ) : (
          <iframe
            src={url}
            title="Delivery preview"
            className="h-64 w-full bg-white"
            sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
            onError={() => setLoadFailed(true)}
          />
        )}
      </div>
    );
  }
