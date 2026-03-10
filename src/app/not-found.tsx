import Link from "next/link";
import Image from "next/image";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 p-6 text-center">
      <Link href="/">
        <Image
          src="/logo.jpeg"
          alt="The Chop Shop"
          width={100}
          height={100}
          className="rounded-full"
        />
      </Link>
      <h1 className="text-4xl font-bold text-gold">404</h1>
      <p className="text-lg text-muted-foreground">
        This page doesn&apos;t exist.
      </p>
      <Link
        href="/"
        className="mt-4 inline-flex items-center justify-center rounded-lg bg-gold hover:bg-gold-dark text-black font-bold px-6 py-3 transition-colors"
      >
        Back to Home
      </Link>
    </div>
  );
}
