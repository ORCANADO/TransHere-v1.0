import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { NuqsAdapter } from 'nuqs/adapters/next/app' // <--- IMPORT THIS

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "TranSpot Directory",
  description: "Find your vibe.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {/* WRAP CHILDREN IN THE ADAPTER */}
        <NuqsAdapter>
          {children}
        </NuqsAdapter>
      </body>
    </html>
  );
}