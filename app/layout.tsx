import type { Metadata, Viewport } from "next";
import { Geist, Frank_Ruhl_Libre, Inter } from "next/font/google";
import "./globals.css";

const sans = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

const display = Geist({
  variable: "--font-display",
  subsets: ["latin"],
  display: "swap",
});

const hebrew = Frank_Ruhl_Libre({
  variable: "--font-hebrew",
  subsets: ["hebrew", "latin"],
  weight: ["400", "500", "700", "900"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "פרשת השבוע היומית — חמש דקות תורה ביום",
  description:
    "פסוק יומי מפרשת השבוע, עם פירוש רש״י בעברית ובאנגלית. בנו רצף לימוד יומי, פסוק אחר פסוק.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "פרשת היום",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fdf6e3" },
    { media: "(prefers-color-scheme: dark)", color: "#0b0b10" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="he"
      dir="rtl"
      className={`${sans.variable} ${display.variable} ${hebrew.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-bg text-fg">
        {children}
      </body>
    </html>
  );
}
