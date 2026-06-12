export default function CustomerQueueLoading() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-2xl rounded-lg border bg-card p-6 shadow-[var(--shadow-panel)]">
        <div className="h-6 w-40 animate-pulse rounded bg-secondary" />
        <div className="mt-6 h-10 w-64 animate-pulse rounded bg-secondary" />
        <div className="mt-6 h-28 animate-pulse rounded-lg bg-secondary" />
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="h-24 animate-pulse rounded-lg bg-secondary" />
          <div className="h-24 animate-pulse rounded-lg bg-secondary" />
        </div>
      </div>
    </main>
  );
}
