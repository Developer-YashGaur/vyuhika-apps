import { Suspense } from "react";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Instrument_Sans, Unbounded } from "next/font/google";
import Backdrop from "@/components/Backdrop";
import CookieBanner from "@/components/CookieBanner";
import GoogleTagManager from "@/components/GoogleTagManager";
import FeedbackWidget from "@/components/feedback/FeedbackWidget";
import MotionProvider from "@/components/MotionProvider";
import ScrollProgress from "@/components/ScrollProgress";
import SmoothScroll from "@/components/SmoothScroll";
import { siteMetadata, siteViewport } from "@/lib/metadata";
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

// Titles, descriptions, share images and theme colour live in lib/metadata.ts.
export const metadata = siteMetadata;
export const viewport = siteViewport;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} antialiased`}>
      <body className="min-h-screen bg-space text-ink">
        <MotionProvider>
          <SmoothScroll />
          <div className="portal-chrome">
            <Backdrop />
            <ScrollProgress />
          </div>
          <div className="relative z-10">{children}</div>
          <div className="portal-chrome">
            <FeedbackWidget />
          </div>
        </MotionProvider>
        {/* Visitor counts (page views, countries, devices, referrers) and page speed. No cookies, nothing visible. */}
        {/* usePathname() needs a Suspense boundary on pages with a changing address (such as /apps/dwaar/requests/[id]). */}
        <Suspense fallback={null}>
          <GoogleTagManager />
          <CookieBanner />
        </Suspense>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
