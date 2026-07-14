import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "./context/AuthContext";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Smart Store",
  description: "Premium E-Commerce Logistics Storefront",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans">
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
