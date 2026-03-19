import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Sidebar } from "@/components/Sidebar";
import { Providers } from "./Providers";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Navaveij ROC Dashboard",
  description: "Clinical AI Recommendation Orchestration Center",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased selection:bg-teal-accent selection:text-navy-950`}
      >
        <Providers>
          <Sidebar />
          <main className="min-h-screen bg-white" style={{ paddingLeft: "var(--sidebar-width)" }}>
            <ErrorBoundary>
              <div className="w-full">
                {children}
              </div>
            </ErrorBoundary>
          </main>
        </Providers>
      </body>
    </html>
  );
}
