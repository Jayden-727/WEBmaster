import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { I18nProvider } from "@/lib/i18n";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "AttractiveWebAI — AI-Powered Website Intelligence",
  description:
    "Analyze any website's structure, content, stack, metadata, links, images, and performance in one intelligent dashboard.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="font-sans overflow-x-hidden">
        <I18nProvider>{children}</I18nProvider>
      </body>
    </html>
  );
}
