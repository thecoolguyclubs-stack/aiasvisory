import type { Metadata } from "next";
import { Noto_Sans, Geist_Mono } from "next/font/google";

import { SiteFooter } from "@/components/layout/SiteFooter";

import "./globals.css";

const geistSans = Noto_Sans({
  variable: "--font-geist-sans",
  subsets: ["latin", "greek"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "InsuranceMarket Health Advisor",
  description: "Αξιολόγηση αναγκών ασφάλισης υγείας.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="el" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body>
        {children}
        <SiteFooter />
      </body>
    </html>
  );
}
