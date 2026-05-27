export default function ProjectDetailLoading() {
  return (
    <main className="flex min-h-screen flex-col items-center p-8">
      <div className="w-full max-w-3xl space-y-8 animate-pulse">
        <div className="flex items-center justify-between">
          <div>
            <div className="h-7 w-56 rounded bg-neutral-200" />
            <div className="mt-1 h-4 w-72 rounded bg-neutral-100" />
          </div>
          <div className="h-4 w-28 rounded bg-neutral-100" />
        </div>

        <div className="h-4 w-full rounded bg-neutral-100" />

        <section className="space-y-3">
          <div className="h-5 w-28 rounded bg-neutral-200" />
          <div className="rounded border border-neutral-200 overflow-hidden">
            <div className="flex gap-4 bg-neutral-50 px-3 py-2">
              <div className="h-4 w-20 rounded bg-neutral-200" />
              <div className="h-4 w-12 rounded bg-neutral-200" />
              <div className="h-4 w-16 rounded bg-neutral-200" />
              <div className="h-4 w-20 rounded bg-neutral-200" />
            </div>
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="flex gap-4 px-3 py-2 border-t border-neutral-100"
              >
                <div className="h-4 w-24 rounded bg-neutral-100" />
                <div className="h-4 w-16 rounded bg-neutral-100" />
                <div className="h-4 w-14 rounded bg-neutral-100" />
                <div className="h-4 w-24 rounded bg-neutral-100" />
              </div>
            ))}
          </div>
        </section>

        <section className="rounded border border-neutral-200 p-4 space-y-3">
          <div className="h-5 w-44 rounded bg-neutral-200" />
          <div className="h-9 rounded bg-neutral-100" />
          <div className="h-20 rounded bg-neutral-100" />
          <div className="h-9 w-48 rounded bg-neutral-300" />
        </section>

        <section className="rounded border border-neutral-200 p-4 space-y-3">
          <div className="h-5 w-40 rounded bg-neutral-200" />
          <div className="h-9 rounded bg-neutral-100" />
          <div className="grid grid-cols-2 gap-3">
            <div className="h-9 rounded bg-neutral-100" />
            <div className="h-9 rounded bg-neutral-100" />
          </div>
        </section>

        <section className="rounded border border-neutral-200 p-4 space-y-3">
          <div className="h-5 w-48 rounded bg-neutral-200" />
          <div className="h-9 rounded bg-neutral-100" />
          {Array.from({ length: 2 }).map((_, i) => (
            <div
              key={i}
              className="rounded bg-neutral-50 p-3 space-y-2"
            >
              <div className="h-4 w-40 rounded bg-neutral-200" />
              <div className="h-3 w-56 rounded bg-neutral-100" />
            </div>
          ))}
        </section>

        <section className="space-y-3">
          <div className="h-5 w-36 rounded bg-neutral-200" />
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="rounded border border-neutral-200 p-4 space-y-2"
            >
              <div className="flex justify-between">
                <div className="space-y-1">
                  <div className="h-4 w-48 rounded bg-neutral-200" />
                  <div className="h-3 w-36 rounded bg-neutral-100" />
                </div>
                <div className="h-4 w-14 rounded bg-neutral-100" />
              </div>
              <div className="h-3 w-full rounded bg-neutral-100" />
            </div>
          ))}
        </section>
      </div>
    </main>
  );
}
