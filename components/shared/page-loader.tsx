/** Route-level fallback shown by `loading.tsx` while a page's server data loads. */
export function PageLoader({ label = "Loading…" }: { label?: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-0 z-30 flex items-center justify-center"
    >
      <div className="loader" />
      <span className="sr-only">{label}</span>
    </div>
  );
}

/**
 * `<Suspense>` fallback for the data part of a page whose heading and layout
 * render immediately — the loader sits where the content will appear.
 */
export function SectionLoader({ label = "Loading…" }: { label?: string }) {
  return (
    <div role="status" aria-live="polite" className="flex min-h-48 items-center justify-center py-16">
      <div className="loader" />
      <span className="sr-only">{label}</span>
    </div>
  );
}
