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

      <div className="flex flex-col gap-4 mt-8 w-full max-w-sm">
        <Link
          href="/join"
          className="flex items-center justify-center rounded-lg border border-gold bg-card p-6 text-center hover:bg-gold/10 transition-colors"
        >
          <span className="text-lg font-semibold text-gold">Join the Queue</span>
        </Link>
        <a
          href={SHOP.bookingUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center rounded-lg bg-gold hover:bg-gold-dark text-black p-6 text-center transition-colors"
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
