import type { Metadata } from "next";
import { Instrument_Sans, Unbounded } from "next/font/google";
import Backdrop from "@/components/Backdrop";
import MotionProvider from "@/components/MotionProvider";
import ScrollProgress from "@/components/ScrollProgress";
import SmoothScroll from "@/components/SmoothScroll";
import { site } from "@/lib/site";
import "./globals.css";

// Unbounded: wide, futuristic letters for the logo and headings.
const display = Unbounded({
  variable: "--font-unbounded",
  subsets: ["latin"],
});

// Instrument Sans: calm and easy to read for body text.
const body = Instrument_Sans({
  variable: "--font-body",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Vyuhika Apps",
  description: `Useful AI tools, some free and some paid. ${site.tagline}`,
  metadataBase: new URL("https://apps.vyuhika.com"),
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} antialiased`}>
      <body className="min-h-screen bg-space text-ink">
        <MotionProvider>
          <SmoothScroll />
          <Backdrop />
          <ScrollProgress />
          <div className="relative z-10">{children}</div>
        </MotionProvider>
      </body>
    </html>
  );
}
