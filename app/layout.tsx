import type { Metadata, Viewport } from "next";
import { Hanken_Grotesk, Shantell_Sans } from "next/font/google";
import { portfolio } from "@/content/portfolio";
import "./globals.css";

const hanken = Hanken_Grotesk({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-sans" });
const hand = Shantell_Sans({ subsets: ["latin"], weight: ["500"], variable: "--font-hand" });

const description = `${portfolio.name}, ${portfolio.role.toLowerCase()}. Projects, experience, skills and résumé, with a soft guide in a maroon scarf who shows you around.`;

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: `${portfolio.name}, ${portfolio.role}`,
  description,
  openGraph: { title: `${portfolio.name}, ${portfolio.role}`, description, type: "website" },
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${hanken.variable} ${hand.variable}`}>
      <body>{children}</body>
    </html>
  );
}
