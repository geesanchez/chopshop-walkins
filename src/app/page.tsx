import Image from "next/image";
import Link from "next/link";
import { SHOP } from "@/lib/shop-config";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-8 p-8">
      <Image
        src="/logo.jpeg"
        alt="The Chop Shop"
        width={200}
        height={200}
        className="rounded-full"
        priority
        sizes="200px"
      />
      <h1 className="text-4xl font-bold text-gold text-center">
        The Chop Shop
        <span className="block text-lg font-normal text-muted-foreground mt-1">
          Barbershop in Watsonville, CA
        </span>
      </h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-8 w-full max-w-md">
        <Link
          href="/kiosk"
          className="flex items-center justify-center rounded-lg border border-border bg-card p-6 text-center hover:border-gold transition-colors"
        >
          <span className="text-lg font-medium">Kiosk</span>
        </Link>
        <Link
          href="/staff"
          className="flex items-center justify-center rounded-lg border border-border bg-card p-6 text-center hover:border-gold transition-colors"
        >
          <span className="text-lg font-medium">Staff</span>
        </Link>
        <Link
          href="/display"
          className="flex items-center justify-center rounded-lg border border-border bg-card p-6 text-center hover:border-gold transition-colors"
        >
          <span className="text-lg font-medium">Display</span>
        </Link>
        <Link
          href="/join"
          className="flex items-center justify-center rounded-lg border border-border bg-card p-6 text-center hover:border-gold transition-colors"
        >
          <span className="text-lg font-medium">Remote Join</span>
        </Link>
        <a
          href={SHOP.bookingUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="sm:col-span-2 flex items-center justify-center rounded-lg bg-gold hover:bg-gold-dark text-black p-6 text-center transition-colors"
        >
          <span className="text-lg font-bold">Book Appointment</span>
        </a>
      </div>

      <footer className="mt-12 text-center text-sm text-muted-foreground space-y-1">
        <p>
          <a href={SHOP.mapsUrl} target="_blank" rel="noopener noreferrer" className="hover:text-gold transition-colors">
            {SHOP.address}
          </a>
        </p>
        <p>
          <a href={SHOP.phoneTel} className="hover:text-gold transition-colors">
            {SHOP.phone}
          </a>
        </p>
        <p>{SHOP.hours.short}</p>
        <p className="mt-3">
          <Link href="/privacy" className="hover:text-gold transition-colors">Privacy</Link>
          {" · "}
          <Link href="/terms" className="hover:text-gold transition-colors">Terms</Link>
        </p>
      </footer>
    </main>
  );
}
