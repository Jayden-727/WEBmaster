import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PageIntel",
  description: "Webpage reverse-engineering and analysis platform."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <main className="mx-auto min-h-screen w-full max-w-6xl p-6">{children}</main>
      </body>
    </html>
  );
}
