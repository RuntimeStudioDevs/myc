export default function ProjectsLoading() {
  return (
    <main className="flex min-h-screen flex-col items-center p-8">
      <div className="w-full max-w-5xl space-y-8 animate-pulse">
        <div className="flex items-center justify-between">
          <div>
            <div className="h-7 w-20 rounded bg-neutral-200" />
            <div className="mt-1 h-4 w-40 rounded bg-neutral-100" />
          </div>
          <div className="h-4 w-36 rounded bg-neutral-100" />
        </div>

        <section className="rounded border border-neutral-200 p-4 space-y-4">
          <div className="h-5 w-28 rounded bg-neutral-200" />
          <div className="grid grid-cols-2 gap-3">
            <div className="h-9 rounded bg-neutral-100" />
            <div className="h-9 rounded bg-neutral-100" />
            <div className="h-9 rounded bg-neutral-100" />
            <div className="h-9 rounded bg-neutral-100" />
            <div className="h-9 rounded bg-neutral-100" />
            <div className="h-9 rounded bg-neutral-100" />
            <div className="h-8 col-span-2 rounded bg-neutral-300" />
          </div>
        </section>

        <section className="space-y-2">
          <div className="h-5 w-36 rounded bg-neutral-200" />
          <div className="rounded border border-neutral-200 overflow-hidden">
            <div className="flex gap-4 bg-neutral-50 px-3 py-2">
              <div className="h-4 w-20 rounded bg-neutral-200" />
              <div className="h-4 w-16 rounded bg-neutral-200" />
              <div className="h-4 w-24 rounded bg-neutral-200" />
              <div className="h-4 w-14 rounded bg-neutral-200" />
              <div className="h-4 w-12 rounded bg-neutral-200" />
              <div className="h-4 w-16 rounded bg-neutral-200" />
            </div>
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="flex gap-4 px-3 py-2 border-t border-neutral-100"
              >
                <div className="h-4 w-28 rounded bg-neutral-100" />
                <div className="h-4 w-24 rounded bg-neutral-100" />
                <div className="h-4 w-20 rounded bg-neutral-100" />
                <div className="h-4 w-16 rounded bg-neutral-100" />
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-16 rounded-full bg-neutral-200" />
                  <div className="h-3 w-8 rounded bg-neutral-100" />
                </div>
                <div className="h-4 w-16 rounded bg-neutral-100" />
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
