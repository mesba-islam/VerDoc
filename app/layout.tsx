import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navbar from "./components/Navbar";
import { Providers } from './providers';
import { Toaster } from "sonner";

// Import Fonts
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "VerDoc.",
  description: "Meet. Speak. Transcribe. VerDoc.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}>
      <Providers>
        {/* Global Navigation */}
         <Navbar /> 
         
        {/* Page Content */}
        <main className="container mx-auto p-6">{children}</main>
        <Toaster richColors position="top-center" />
        </Providers>
        
      </body>
    </html>
  );
}
