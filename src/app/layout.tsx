import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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
  metadataBase: new URL("https://thechopshopwatsonville.com"),
  title: "The Chop Shop — Walk-in Queue",
  description: "Walk-in queue management for The Chop Shop, Watsonville CA. Join the line from anywhere!",
  openGraph: {
    title: "The Chop Shop",
    description: "Walk-in queue — join the line from anywhere",
    siteName: "The Chop Shop",
    url: "https://thechopshopwatsonville.com",
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
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
