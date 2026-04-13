export default function DashboardLoading() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-6 py-10 lg:px-10">
      {/* Greeting skeleton */}
      <div className="h-8 w-56 animate-pulse rounded-md bg-muted/40" />

      {/* Stats strip skeleton */}
      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-20 animate-pulse rounded-lg bg-muted/40" />
        ))}
      </div>

      {/* Filter bar skeleton */}
      <div className="flex gap-2">
        <div className="h-8 w-36 animate-pulse rounded-md bg-muted/40" />
        <div className="h-8 w-36 animate-pulse rounded-md bg-muted/40" />
        <div className="h-8 w-44 animate-pulse rounded-md bg-muted/40" />
      </div>

      {/* Issue groups skeleton */}
      <div className="flex flex-col gap-6">
        {Array.from({ length: 2 }).map((_, g) => (
          <div key={g} className="flex flex-col gap-1.5">
            <div className="h-5 w-40 animate-pulse rounded bg-muted/40" />
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-14 animate-pulse rounded-md bg-muted/40" />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
