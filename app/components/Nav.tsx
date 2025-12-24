import Link from 'next/link';
import NavAuth from './NavAuth';
import ThemeToggle from './ThemeToggle';

export default function Nav() {
  return (
    <nav className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-black">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-8">
            <Link
              href="/"
              className="text-lg font-semibold text-foreground hover:text-zinc-600 dark:hover:text-zinc-400 transition-colors"
            >
              INDEX
            </Link>
            <div className="flex items-center space-x-6">
              <Link
                href="/projects"
                className="text-sm text-zinc-600 dark:text-zinc-400 hover:text-foreground transition-colors"
              >
                Projects
              </Link>
              <Link
                href="/unassigned"
                className="text-sm text-zinc-600 dark:text-zinc-400 hover:text-foreground transition-colors"
              >
                Unassigned
              </Link>
              <Link
                href="/ask"
                className="text-sm text-zinc-600 dark:text-zinc-400 hover:text-foreground transition-colors"
              >
                Ask
              </Link>
              <Link
                href="/import"
                className="text-sm text-zinc-600 dark:text-zinc-400 hover:text-foreground transition-colors"
              >
                Import
              </Link>
              <Link
                href="/tools"
                className="text-sm text-zinc-600 dark:text-zinc-400 hover:text-foreground transition-colors"
              >
                Tools
              </Link>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/feedback"
              className="text-sm text-zinc-600 dark:text-zinc-400 hover:text-foreground transition-colors"
            >
              Feedback
            </Link>
            <Link
              href="/settings"
              className="text-sm text-zinc-600 dark:text-zinc-400 hover:text-foreground transition-colors"
            >
              Settings
            </Link>
            <ThemeToggle />
            <NavAuth />
          </div>
        </div>
      </div>
    </nav>
  );
}

