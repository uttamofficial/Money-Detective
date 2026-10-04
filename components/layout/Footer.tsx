import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-stone-200 bg-white">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
          <div className="max-w-sm">
            <p className="font-display text-lg font-semibold tracking-tight text-stone-900">
              Money Detective
            </p>
            <p className="mt-2 text-sm leading-relaxed text-stone-500">
              Your spending has clues. We investigate them. Built for a friend,
              powered by open-source AI with local inference.
            </p>
          </div>

          <nav
            className="flex gap-16 text-sm"
            aria-label="Footer"
          >
            <div className="flex flex-col gap-2.5">
              <p className="text-xs font-semibold tracking-wider text-stone-400 uppercase">
                Product
              </p>
              <Link href="/" className="text-stone-600 hover:text-stone-900">
                Home
              </Link>
              <Link href="/upload" className="text-stone-600 hover:text-stone-900">
                Upload
              </Link>
              <Link
                href="/dashboard"
                className="text-stone-600 hover:text-stone-900"
              >
                Dashboard
              </Link>
            </div>
            <div className="flex flex-col gap-2.5">
              <p className="text-xs font-semibold tracking-wider text-stone-400 uppercase">
                Trust
              </p>
              <span className="text-stone-600">
                Your financial data stays local
              </span>
              <span className="text-stone-600">No account needed</span>
              <span className="text-stone-600">CSV only, nothing else</span>
            </div>
          </nav>
        </div>

        <div className="mt-10 flex flex-col gap-2 border-t border-stone-200 pt-6 text-xs text-stone-400 sm:flex-row sm:items-center sm:justify-between">
          <span>© 2026 Money Detective · Built for a friend</span>
          <span>Built with open-source AI + local inference</span>
        </div>
      </div>
    </footer>
  );
}
