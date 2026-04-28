import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FinCore Dashboard",
  description: "Financial analytics dashboard with customizable graphs",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}