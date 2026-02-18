import Image from "next/image";
import Link from "next/link";
import { SHOP } from "@/lib/shop-config";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-8 p-8">
      <Image
        src="/logo.jpeg"
        alt="The Chop Shop"
        width={200}
        height={200}
        className="rounded-full"
        priority
      />
      <h1 className="text-4xl font-bold text-gold">The Chop Shop</h1>
      <p className="text-muted-foreground text-lg">Walk-in Queue System</p>

      <div className="grid grid-cols-2 gap-4 mt-8 w-full max-w-md">
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
          className="col-span-2 flex items-center justify-center rounded-lg bg-gold hover:bg-gold-dark text-black p-6 text-center transition-colors"
        >
          <span className="text-lg font-bold">Book Appointment</span>
        </a>
      </div>
    </div>
  );
}
