import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Gym Manager MVP",
  description: "Next.js + Prisma + SQLite starter for gym management.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
