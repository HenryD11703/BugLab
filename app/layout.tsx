import type { Metadata } from "next";
import { Space_Grotesk, Space_Mono } from "next/font/google";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  weight: ["300", "400", "500", "600", "700"],
});

const spaceMono = Space_Mono({
  subsets: ["latin"],
  variable: "--font-space-mono",
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  title: "BugLab — Debug. Think. Write.",
  description:
    "BugLab is an open-source coding challenge platform focused on writing and reviewing code, not just solving puzzles.",
  keywords: ["debugging", "python", "coding", "open source", "buglab"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${spaceGrotesk.variable} ${spaceMono.variable} h-full`}
      style={{ fontFamily: "var(--font-space-grotesk), sans-serif" }}
    >
      <body className="min-h-full bg-[#FAFAFA] text-[#0A0A0A]">{children}</body>
    </html>
  );
}
