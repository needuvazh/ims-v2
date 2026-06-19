'use client';

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="space-y-4 rounded-[28px] border border-[color:var(--ims-border)] bg-[color:var(--ims-surface)] p-6">
      <h2 className="text-xl font-semibold">Something interrupted the dashboard</h2>
      <p className="text-sm leading-6 text-[color:var(--ims-muted)]">{error.message}</p>
      <button
        className="rounded-full bg-[color:var(--ims-ink)] px-4 py-2 text-sm font-medium text-[color:var(--ims-paper)]"
        onClick={reset}
      >
        Try again
      </button>
    </div>
  );
}
