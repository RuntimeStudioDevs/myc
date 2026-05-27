export default function ClientDashboardLoading() {
  return (
    <main className="flex min-h-screen flex-col items-center p-8">
      <div className="w-full max-w-4xl space-y-8 animate-pulse">
        <div className="flex items-center justify-between">
          <div>
            <div className="h-7 w-28 rounded bg-neutral-200" />
            <div className="mt-1 h-4 w-48 rounded bg-neutral-100" />
          </div>
          <div className="h-8 w-32 rounded bg-neutral-200" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="rounded border border-neutral-200 p-4">
            <div className="h-7 w-8 rounded bg-neutral-200" />
            <div className="mt-1 h-4 w-24 rounded bg-neutral-100" />
          </div>
          <div className="rounded border border-neutral-200 p-4">
            <div className="h-7 w-8 rounded bg-neutral-200" />
            <div className="mt-1 h-4 w-40 rounded bg-neutral-100" />
          </div>
        </div>

        {Array.from({ length: 2 }).map((_, i) => (
          <section
            key={i}
            className="rounded border border-neutral-200 p-6 space-y-4"
          >
            <div>
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1 flex-1">
                  <div className="h-5 w-48 rounded bg-neutral-200" />
                  <div className="h-4 w-72 rounded bg-neutral-100" />
                </div>
                <div className="h-5 w-24 rounded bg-neutral-200" />
              </div>

              <div className="mt-3 flex items-center gap-3">
                <div className="h-2 flex-1 rounded-full bg-neutral-200" />
                <div className="h-4 w-10 rounded bg-neutral-100" />
              </div>

              <div className="mt-3 flex gap-6">
                <div className="h-3 w-28 rounded bg-neutral-100" />
                <div className="h-3 w-36 rounded bg-neutral-100" />
              </div>
            </div>

            <div className="border-t border-neutral-100 pt-4 space-y-2">
              <div className="h-3 w-24 rounded bg-neutral-100" />
              <div className="flex gap-2">
                <div className="h-5 w-28 rounded bg-neutral-100" />
                <div className="h-5 w-20 rounded bg-neutral-100" />
              </div>
            </div>

            <div className="border-t border-neutral-100 pt-4 space-y-2">
              <div className="h-4 w-20 rounded bg-neutral-200" />
              <div className="rounded border border-neutral-100 p-3 space-y-2">
                <div className="h-4 w-56 rounded bg-neutral-200" />
                <div className="h-3 w-36 rounded bg-neutral-100" />
                <div className="h-3 w-full rounded bg-neutral-100" />
              </div>
            </div>

            <div className="border-t border-neutral-100 pt-4 space-y-2">
              <div className="h-4 w-28 rounded bg-neutral-200" />
              <div className="h-8 rounded bg-neutral-100" />
              <div className="h-8 rounded bg-neutral-100" />
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
