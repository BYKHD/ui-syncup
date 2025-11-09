import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "@styles/globals.css";
import { ThemeProvider } from "@providers/theme-provider";
import { Toaster } from "@components/ui/sonner";
import { AppShell } from "@components/layout/app-shell";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: 'Settings',
  description: 'Manage your account settings and preferences',
};


export default function SettingLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <></>
  );
}
