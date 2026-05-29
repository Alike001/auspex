  "use client";

  import Link from "next/link";
  import { ConnectButton } from "@rainbow-me/rainbowkit";

  export function Header() {
    return (
      <header className="sticky top-0 z-50 border-b border-border bg-bg/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-linear-to-br from-accent-light to-accent text-sm font-bold text-white">
              A
            </span>
            <span className="text-sm font-semibold tracking-tight">Auspex</span>
          </Link>

          <nav className="hidden items-center gap-6 text-sm text-text-secondary sm:flex">
            <Link href="/jobs" className="transition hover:text-text-primary">
              Jobs
            </Link>
          </nav>

          <ConnectButton
            accountStatus="address"
            chainStatus="icon"
            showBalance={false}
          />
        </div>
      </header>
    );
  }
