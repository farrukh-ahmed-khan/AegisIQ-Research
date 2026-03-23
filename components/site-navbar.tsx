"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_VISIBLE_PREFIXES = [
  "/",
  "/features",
  "/pricing",
  "/about",
  "/contact",
  "/sign-in",
  "/sign-up"
];

export default function SiteNavbar() {
  const pathname = usePathname();

  if (!shouldShowNavbar(pathname)) {
    return null;
  }

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="text-lg font-semibold text-slate-900">
          AegisIQ
        </Link>

        <nav className="flex items-center gap-6 text-sm font-medium text-slate-700">
          <Link href="/features" className="hover:text-slate-900">
            Features
          </Link>
          <Link href="/pricing" className="hover:text-slate-900">
            Pricing
          </Link>
          <Link href="/about" className="hover:text-slate-900">
            About
          </Link>
          <Link href="/contact" className="hover:text-slate-900">
            Contact
          </Link>
        </nav>

        <div className="flex items-center gap-3">
          <Link
            href="/sign-in"
            className="rounded-full px-4 py-2 text-sm font-semibold text-slate-700 hover:text-slate-900"
          >
            Sign in
          </Link>
          <Link
            href="/sign-up"
            className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
          >
            Sign up
          </Link>
        </div>
      </div>
    </header>
  );
}

function shouldShowNavbar(pathname: string) {
  if (pathname === "/") {
    return true;
  }

  return NAV_VISIBLE_PREFIXES.some((prefix) =>
    prefix === "/" ? false : pathname.startsWith(prefix)
  );
}
