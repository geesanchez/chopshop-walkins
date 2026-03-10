"use client";

import Link from "next/link";
import Image from "next/image";

export default function ErrorBoundary({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 p-6 text-center">
      <Link href="/">
        <Image
          src="/logo.jpeg"
          alt="The Chop Shop"
          width={100}
          height={100}
          className="rounded-full"
          sizes="100px"
        />
      </Link>
      <h1 className="text-2xl font-bold text-destructive">Something went wrong</h1>
      <p className="text-muted-foreground">
        An unexpected error occurred. Please try again.
      </p>
      <button
        onClick={reset}
        className="mt-4 inline-flex items-center justify-center rounded-lg bg-gold hover:bg-gold-dark text-black font-bold px-6 py-3 transition-colors"
      >
        Try Again
      </button>
    </div>
  );
}
