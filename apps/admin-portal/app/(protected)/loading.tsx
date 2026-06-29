export default function Loading() {
  return (
    <div className="space-y-4">
      <div className="h-7 w-48 animate-pulse rounded-full bg-[color:var(--ims-accent-soft)]" />
      <div className="grid gap-4 md:grid-cols-2">
        <div className="h-32 animate-pulse rounded-2xl bg-[color:var(--ims-accent-soft)]" />
        <div className="h-32 animate-pulse rounded-2xl bg-[color:var(--ims-accent-soft)]" />
      </div>
    </div>
  );
}
