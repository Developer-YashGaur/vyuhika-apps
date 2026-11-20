import type { Viewport } from "next";
import { Inter } from "next/font/google";
import DwaarFooter from "@/components/dwaar/DwaarFooter";
import DwaarHeader from "@/components/dwaar/DwaarHeader";
import "./dwaar.css";

// Dwaar has its own look (clean, white, one blue accent), fonts, header and footer. It does not share the rest of Vyuhika Apps' design.
// Inter: one clear, modern typeface for headings and text. It is used as the font variable below.
const body = Inter({ subsets: ["latin"], variable: "--font-dw-body", display: "swap" });

export const viewport: Viewport = { themeColor: "#ffffff" };

export default function DwaarLayout({ children }: { children: React.ReactNode }) {
  return (
    <div data-app="dwaar" className={`dw-root ${body.variable}`}>
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
