import type { Metadata } from "next";
import Link from "next/link";
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
      <body>
        <nav style={navStyle}>
          <div style={navContentStyle}>
            <Link href="/" style={logoStyle}>FinCore</Link>
            <div style={navLinksStyle}>
              <Link href="/" style={navLinkStyle}>Dashboard</Link>
              <Link href="/projection" style={navLinkStyle}>Projection</Link>
            </div>
          </div>
        </nav>
        <main style={mainStyle}>{children}</main>
      </body>
    </html>
  );
}

const navStyle: React.CSSProperties = {
  background: "#ffffff",
  borderBottom: "1px solid #e5e7eb",
  padding: "0 1.5rem",
  height: "56px",
  display: "flex",
  alignItems: "center",
  position: "sticky",
  top: 0,
  zIndex: 100,
};

const navContentStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  width: "100%",
  maxWidth: "1200px",
  margin: "0 auto",
};

const logoStyle: React.CSSProperties = {
  fontSize: "1.25rem",
  fontWeight: 700,
  color: "#2563eb",
  textDecoration: "none",
};

const navLinksStyle: React.CSSProperties = {
  display: "flex",
  gap: "1.5rem",
};

const navLinkStyle: React.CSSProperties = {
  fontSize: "0.9375rem",
  fontWeight: 500,
  color: "#6b7280",
  textDecoration: "none",
  padding: "0.5rem 0",
  borderBottom: "2px solid transparent",
  transition: "all 0.2s",
};

const mainStyle: React.CSSProperties = {
  padding: "1.5rem",
  maxWidth: "1200px",
  margin: "0 auto",
};