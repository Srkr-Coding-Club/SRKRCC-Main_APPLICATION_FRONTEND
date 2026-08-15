export default function PlatformModulesSkeleton() {
  return (
    <section className="relative py-20 sm:py-28 bg-[var(--background)] transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-12 sm:mb-14">
          <div className="h-3 w-32 rounded bg-black/10 dark:bg-white/10 animate-pulse mb-3" />
          <div className="h-8 w-72 rounded bg-black/10 dark:bg-white/10 animate-pulse" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="rounded-2xl p-6 border border-black/10 dark:border-white/10 bg-[var(--card-bg)] animate-pulse"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <div className="w-12 h-12 rounded-full bg-black/10 dark:bg-white/10 mb-5" />
              <div className="h-4 w-32 rounded bg-black/10 dark:bg-white/10 mb-3" />
              <div className="h-3 w-full rounded bg-black/10 dark:bg-white/10 mb-1.5" />
              <div className="h-3 w-3/4 rounded bg-black/10 dark:bg-white/10" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
