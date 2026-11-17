import type { Viewport } from "next";
import { Fraunces, Source_Sans_3 } from "next/font/google";
import DwaarFooter from "@/components/dwaar/DwaarFooter";
import DwaarHeader from "@/components/dwaar/DwaarHeader";
import "./dwaar.css";

// Dwaar has its own look, fonts, header and footer. It does not share the rest of Vyuhika Apps' design.
// Fraunces: a warm serif for headings. Source Sans 3: a clear, professional sans for everything else.
const display = Fraunces({ subsets: ["latin"], variable: "--font-dw-display", display: "swap" });
const body = Source_Sans_3({ subsets: ["latin"], variable: "--font-dw-body", display: "swap" });

export const viewport: Viewport = { themeColor: "#0b2f2c" };

export default function DwaarLayout({ children }: { children: React.ReactNode }) {
  return (
    <div data-app="dwaar" className={`dw-root ${display.variable} ${body.variable}`}>
      <a href="#dw-main" className="dw-skip">
        Skip to content
      </a>
      <DwaarHeader />
      <main id="dw-main" className="dw-main">
        {children}
      </main>
      <DwaarFooter />
    </div>
  );
}
