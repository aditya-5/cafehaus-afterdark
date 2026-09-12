import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Caféhaus After Dark",
  description: "A rooftop coffee bar, built for one very good night.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
