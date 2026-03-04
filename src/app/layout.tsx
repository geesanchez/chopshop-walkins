import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SHOP } from "@/lib/shop-config";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  metadataBase: new URL("https://queue.thechopshopwatsonville.com"),
  alternates: { canonical: "/" },
  title: "The Chop Shop — Walk-in Queue",
  other: { "theme-color": "#0A0A0A" },
  description: "Walk-in queue management for The Chop Shop, Watsonville CA. Join the line from anywhere!",
  openGraph: {
    title: "The Chop Shop",
    description: "Walk-in queue — join the line from anywhere",
    siteName: "The Chop Shop",
    url: "https://queue.thechopshopwatsonville.com",
    images: [{ url: "/logo.jpeg", width: 500, height: 500 }],
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "The Chop Shop",
    description: "Walk-in queue — join the line from anywhere",
    images: ["/logo.jpeg"],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "The Chop Shop",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BarberShop",
    name: SHOP.name,
    url: SHOP.domain,
    telephone: SHOP.phone,
    address: {
      "@type": "PostalAddress",
      streetAddress: "501b Main St",
      addressLocality: "Watsonville",
      addressRegion: "CA",
      postalCode: "95076",
      addressCountry: "US",
    },
    image: `${SHOP.domain}/logo.jpeg`,
    openingHoursSpecification: [
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: ["Tuesday", "Wednesday", "Thursday", "Friday"],
        opens: "10:00",
        closes: "18:00",
      },
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: "Saturday",
        opens: "10:00",
        closes: "15:00",
      },
    ],
  };

  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        {children}
        <Analytics />
      </body>
    </html>
  );
}
